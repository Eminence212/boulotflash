import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export type AccessClaims = {
  sub: string;
  typ: 'access';
  jti: string;
};

@Injectable()
export class JwtService {
  private readonly secret: Uint8Array;
  private readonly accessTtlSec: number;

  constructor() {
    const raw = process.env.JWT_SECRET?.trim();
    if (!raw) throw new Error('JWT_SECRET is required');
    this.secret = new TextEncoder().encode(raw);
    this.accessTtlSec = Number(process.env.JWT_ACCESS_TTL ?? 900);
  }

  getAccessTtlSeconds(): number {
    return this.accessTtlSec;
  }

  async signAccess(userId: string): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const token = await new SignJWT({ typ: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setJti(jti)
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtlSec}s`)
      .sign(this.secret);
    return { token, jti };
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    const { payload } = await jwtVerify(token, this.secret, {
      algorithms: ['HS256'],
    });
    const sub = payload.sub;
    const jti = payload.jti;
    if (!sub || !jti || payload.typ !== 'access') {
      throw new Error('invalid access token');
    }
    return { sub, typ: 'access', jti };
  }

  peekPayload(token: string): JWTPayload | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;
      return JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as JWTPayload;
    } catch {
      return null;
    }
  }
}
