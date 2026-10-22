import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';

export type AdminScopeClaim = 'SUPPORT' | 'MODERATOR' | 'FINANCE' | 'SUPER';

export type AdminAccessClaims = {
  sub: string;
  typ: 'admin';
  scope: AdminScopeClaim;
  jti: string;
};

export type AdminChallengeClaims = {
  sub: string;
  typ: 'admin_challenge';
  scope: AdminScopeClaim;
  jti: string;
};

const CHALLENGE_TTL_SEC = 300;

@Injectable()
export class AdminJwtService {
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

  getChallengeTtlSeconds(): number {
    return CHALLENGE_TTL_SEC;
  }

  async signAdminAccess(
    userId: string,
    scope: AdminScopeClaim,
  ): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const token = await new SignJWT({ typ: 'admin', scope })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setJti(jti)
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtlSec}s`)
      .sign(this.secret);
    return { token, jti };
  }

  async verifyAdminAccess(token: string): Promise<AdminAccessClaims> {
    const { payload } = await jwtVerify(token, this.secret, {
      algorithms: ['HS256'],
    });
    const sub = payload.sub;
    const jti = payload.jti;
    const scope = payload.scope as AdminScopeClaim | undefined;
    if (
      !sub ||
      !jti ||
      payload.typ !== 'admin' ||
      !scope ||
      !['SUPPORT', 'MODERATOR', 'FINANCE', 'SUPER'].includes(scope)
    ) {
      throw new Error('invalid admin access token');
    }
    return { sub, typ: 'admin', scope, jti };
  }

  async signChallenge(
    userId: string,
    scope: AdminScopeClaim,
  ): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const token = await new SignJWT({ typ: 'admin_challenge', scope })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setJti(jti)
      .setIssuedAt()
      .setExpirationTime(`${CHALLENGE_TTL_SEC}s`)
      .sign(this.secret);
    return { token, jti };
  }

  async verifyChallenge(token: string): Promise<AdminChallengeClaims> {
    const { payload } = await jwtVerify(token, this.secret, {
      algorithms: ['HS256'],
    });
    const sub = payload.sub;
    const jti = payload.jti;
    const scope = payload.scope as AdminScopeClaim | undefined;
    if (
      !sub ||
      !jti ||
      payload.typ !== 'admin_challenge' ||
      !scope ||
      !['SUPPORT', 'MODERATOR', 'FINANCE', 'SUPER'].includes(scope)
    ) {
      throw new Error('invalid admin challenge');
    }
    return { sub, typ: 'admin_challenge', scope, jti };
  }
}
