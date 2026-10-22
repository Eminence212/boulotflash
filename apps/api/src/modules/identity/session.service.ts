import { createHash, randomBytes } from 'node:crypto';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from './jwt.service';
import { maskEmail } from './mask';

export type SessionPair = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshMaxAgeSec: number;
  userId: string;
};

function hashRefresh(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly refreshTtlSec: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {
    this.refreshTtlSec = Number(process.env.JWT_REFRESH_TTL ?? 2_592_000);
  }

  getRefreshTtlSeconds(): number {
    return this.refreshTtlSec;
  }

  async issueSession(
    userId: string,
    userAgent?: string,
  ): Promise<SessionPair> {
    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.refreshTtlSec * 1000);
    await this.prisma.client.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefresh(refreshToken),
        expiresAt,
        userAgent: userAgent?.slice(0, 512) ?? null,
      },
    });
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    const { token: accessToken } = await this.jwt.signAccess(userId);
    return {
      accessToken,
      expiresIn: this.jwt.getAccessTtlSeconds(),
      refreshToken,
      refreshMaxAgeSec: this.refreshTtlSec,
      userId,
    };
  }

  async rotateRefresh(
    rawRefresh: string,
    userAgent?: string,
  ): Promise<SessionPair> {
    const tokenHash = hashRefresh(rawRefresh);
    const existing = await this.prisma.client.refreshToken.findFirst({
      where: { tokenHash },
    });
    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new HttpException({ code: 'UNAUTHORIZED', message: 'Refresh invalide.' }, 401);
    }

    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.refreshTtlSec * 1000);
    const created = await this.prisma.client.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashRefresh(refreshToken),
        expiresAt,
        userAgent: userAgent?.slice(0, 512) ?? existing.userAgent,
      },
    });
    await this.prisma.client.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBy: created.id },
    });

    const { token: accessToken } = await this.jwt.signAccess(existing.userId);
    return {
      accessToken,
      expiresIn: this.jwt.getAccessTtlSeconds(),
      refreshToken,
      refreshMaxAgeSec: this.refreshTtlSec,
      userId: existing.userId,
    };
  }

  async revokeRefresh(rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) return;
    const tokenHash = hashRefresh(rawRefresh);
    await this.prisma.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createDevUser(email?: string): Promise<{ id: string; email: string | null }> {
    const addr =
      email?.trim().toLowerCase() ||
      `dev-${randomBytes(4).toString('hex')}@boulotflash.local`;
    const user = await this.prisma.client.user.create({
      data: {
        email: addr,
        status: 'INCOMPLETE',
        locale: 'fr',
      },
    });
    this.logger.log(`dev-session user créé email=${maskEmail(user.email)}`);
    return { id: user.id, email: user.email };
  }

  async getUserForMe(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        phoneConfirmedAt: true,
        ageConfirmedAt: true,
        activeMode: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new HttpException({ code: 'UNAUTHORIZED', message: 'Session invalide.' }, 401);
    }
    return user;
  }
}
