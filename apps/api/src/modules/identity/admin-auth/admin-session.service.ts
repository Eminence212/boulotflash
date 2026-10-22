import { createHash, randomBytes } from 'node:crypto';
import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminJwtService,
  type AdminScopeClaim,
} from './admin-jwt.service';
import { ADMIN_REFRESH_UA } from './admin-cookie';

export type AdminSessionPair = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshMaxAgeSec: number;
  userId: string;
  scope: AdminScopeClaim;
};

function hashRefresh(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

@Injectable()
export class AdminSessionService {
  private readonly refreshTtlSec: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: AdminJwtService,
  ) {
    this.refreshTtlSec = Number(process.env.JWT_REFRESH_TTL ?? 2_592_000);
  }

  getRefreshTtlSeconds(): number {
    return this.refreshTtlSec;
  }

  async issueSession(
    userId: string,
    scope: AdminScopeClaim,
  ): Promise<AdminSessionPair> {
    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.refreshTtlSec * 1000);
    await this.prisma.client.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefresh(refreshToken),
        expiresAt,
        userAgent: ADMIN_REFRESH_UA,
      },
    });
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    const { token: accessToken } = await this.jwt.signAdminAccess(userId, scope);
    return {
      accessToken,
      expiresIn: this.jwt.getAccessTtlSeconds(),
      refreshToken,
      refreshMaxAgeSec: this.refreshTtlSec,
      userId,
      scope,
    };
  }

  async revokeRefresh(rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) return;
    const tokenHash = hashRefresh(rawRefresh);
    await this.prisma.client.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
        userAgent: ADMIN_REFRESH_UA,
      },
      data: { revokedAt: new Date() },
    });
  }

  async assertAdminRefresh(rawRefresh: string): Promise<void> {
    const tokenHash = hashRefresh(rawRefresh);
    const existing = await this.prisma.client.refreshToken.findFirst({
      where: { tokenHash },
    });
    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt < new Date() ||
      existing.userAgent !== ADMIN_REFRESH_UA
    ) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Refresh admin invalide.' },
        401,
      );
    }
  }
}
