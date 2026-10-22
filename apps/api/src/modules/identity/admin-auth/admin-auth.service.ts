import { createHash } from 'node:crypto';
import { HttpException, Injectable } from '@nestjs/common';
import {
  decryptTotpSecret,
  encodeTotpSecretForStorage,
  generateRecoveryCodes,
  generateTotpSecret,
  verifyTotpCode,
} from '@boulotflash/database';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminJwtService,
  type AdminScopeClaim,
} from './admin-jwt.service';
import { AdminLockoutService } from './admin-lockout.service';
import { AdminSessionService, type AdminSessionPair } from './admin-session.service';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function isAdminScope(value: unknown): value is AdminScopeClaim {
  return (
    value === 'SUPPORT' ||
    value === 'MODERATOR' ||
    value === 'FINANCE' ||
    value === 'SUPER'
  );
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: AdminJwtService,
    private readonly sessions: AdminSessionService,
    private readonly lockout: AdminLockoutService,
  ) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ totpRequired: true; challengeToken: string; challengeMaxAgeSec: number }> {
    const user = await this.prisma.client.user.findFirst({
      where: { username: username.trim() },
      include: {
        roles: { where: { role: 'ADMIN' } },
        authIdentities: { select: { id: true }, take: 1 },
      },
    });

    // Réponse uniforme pour ne pas révéler l’existence du compte.
    const deny = () => {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Identifiants invalides.' },
        401,
      );
    };

    if (!user?.passwordHash || user.authIdentities.length > 0) deny();
    const adminRole = user!.roles.find((r) => r.role === 'ADMIN');
    if (!adminRole?.adminScope || !isAdminScope(adminRole.adminScope)) deny();
    if (user!.status === 'CLOSED' || user!.status === 'SUSPENDED') deny();

    const ok = await argon2.verify(user!.passwordHash!, password);
    if (!ok) deny();

    if (await this.lockout.isLocked(user!.id)) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT',
          message: 'Compte temporairement bloqué après trop d’échecs TOTP.',
        },
        429,
      );
    }

    const { token } = await this.jwt.signChallenge(
      user!.id,
      adminRole!.adminScope as AdminScopeClaim,
    );
    return {
      totpRequired: true,
      challengeToken: token,
      challengeMaxAgeSec: this.jwt.getChallengeTtlSeconds(),
    };
  }

  async verifyTotp(
    challengeToken: string | undefined,
    code: string,
  ): Promise<AdminSessionPair> {
    if (!challengeToken) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Défi TOTP manquant ou expiré.' },
        401,
      );
    }

    let challenge;
    try {
      challenge = await this.jwt.verifyChallenge(challengeToken);
    } catch {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Défi TOTP manquant ou expiré.' },
        401,
      );
    }

    if (await this.lockout.isLocked(challenge.sub)) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT',
          message: 'Compte temporairement bloqué après trop d’échecs TOTP.',
        },
        429,
      );
    }

    const cleaned = code.trim();
    const totpOk = await this.tryTotp(challenge.sub, cleaned);
    const recoveryOk = totpOk ? false : await this.tryRecovery(challenge.sub, cleaned);

    if (!totpOk && !recoveryOk) {
      const { locked } = await this.lockout.recordFailure(challenge.sub);
      throw new HttpException(
        {
          code: locked ? 'RATE_LIMIT' : 'UNAUTHORIZED',
          message: locked
            ? 'Compte temporairement bloqué après trop d’échecs TOTP.'
            : 'Code TOTP invalide.',
        },
        locked ? 429 : 401,
      );
    }

    await this.lockout.clearFailures(challenge.sub);
    const session = await this.sessions.issueSession(
      challenge.sub,
      challenge.scope,
    );

    await this.prisma.client.auditLog.create({
      data: {
        actorId: challenge.sub,
        action: 'ADMIN_LOGIN',
        entityType: 'user',
        entityId: challenge.sub,
        metadata: { scope: challenge.scope, via: totpOk ? 'totp' : 'recovery' },
      },
    });

    return session;
  }

  private async tryTotp(userId: string, code: string): Promise<boolean> {
    const row = await this.prisma.client.adminTotpSecret.findUnique({
      where: { userId },
    });
    if (!row?.secretEncrypted || !row.confirmedAt) return false;
    try {
      const secret = decryptTotpSecret(row.secretEncrypted);
      return verifyTotpCode(secret, code);
    } catch {
      return false;
    }
  }

  private async tryRecovery(userId: string, code: string): Promise<boolean> {
    const hash = sha256Hex(code);
    const row = await this.prisma.client.recoveryCode.findFirst({
      where: { userId, codeHash: hash, usedAt: null },
    });
    if (!row) return false;
    await this.prisma.client.recoveryCode.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    return true;
  }

  async createInternalUser(
    actorId: string,
    input: { username: string; password: string; adminScope: AdminScopeClaim },
  ): Promise<{
    id: string;
    username: string;
    adminScope: AdminScopeClaim;
    totpSecret: string;
    recoveryCodes: string[];
  }> {
    const username = input.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message:
            'Identifiant invalide (3–32 caractères, a-z, chiffres, . _ -).',
        },
        400,
      );
    }
    if (!isAdminScope(input.adminScope)) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'adminScope invalide.' },
        400,
      );
    }
    if (!input.password || input.password.length < 12) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: 'Mot de passe trop court (12 caractères minimum).',
        },
        400,
      );
    }

    const taken = await this.prisma.client.user.findFirst({
      where: { username },
      select: { id: true },
    });
    if (taken) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Identifiant déjà utilisé.' },
        409,
      );
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });
    const totpSecret = generateTotpSecret();
    const secretEncrypted = encodeTotpSecretForStorage(totpSecret);
    const recoveryCodes = generateRecoveryCodes(8);

    const user = await this.prisma.client.user.create({
      data: {
        username,
        passwordHash,
        displayName: username,
        status: 'ACTIVE',
        roles: {
          create: { role: 'ADMIN', adminScope: input.adminScope },
        },
        adminTotpSecret: {
          create: {
            secretEncrypted,
            confirmedAt: new Date(),
          },
        },
        recoveryCodes: {
          create: recoveryCodes.map((c) => ({ codeHash: sha256Hex(c) })),
        },
      },
    });

    await this.prisma.client.auditLog.create({
      data: {
        actorId,
        action: 'ADMIN_USER_CREATED',
        entityType: 'user',
        entityId: user.id,
        metadata: { username, adminScope: input.adminScope },
      },
    });

    return {
      id: user.id,
      username,
      adminScope: input.adminScope,
      totpSecret,
      recoveryCodes,
    };
  }

  async getUserForSupport(id: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        username: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        roles: { select: { role: true, adminScope: true } },
        authIdentities: {
          select: { provider: true, providerUserId: true, createdAt: true },
        },
      },
    });
    if (!user) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Utilisateur introuvable.' },
        404,
      );
    }
    return user;
  }

  async closeUser(actorId: string, targetId: string): Promise<{ id: string; status: string }> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: targetId },
      select: { id: true, status: true, roles: { select: { role: true } } },
    });
    if (!user) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Utilisateur introuvable.' },
        404,
      );
    }
    if (user.roles.some((r) => r.role === 'ADMIN')) {
      throw new HttpException(
        {
          code: 'FORBIDDEN',
          message: 'Fermeture d’un compte interne non autorisée ici.',
        },
        403,
      );
    }
    await this.prisma.client.user.update({
      where: { id: targetId },
      data: { status: 'CLOSED' },
    });
    await this.prisma.client.auditLog.create({
      data: {
        actorId,
        action: 'ADMIN_USER_CLOSED',
        entityType: 'user',
        entityId: targetId,
        metadata: {},
      },
    });
    return { id: targetId, status: 'CLOSED' };
  }

  async suspendJob(
    actorId: string,
    jobId: string,
    reason: string,
  ): Promise<{ id: string; status: string }> {
    const motif = reason.trim();
    if (motif.length < 3 || motif.length > 500) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Motif de suspension invalide.' },
        400,
      );
    }
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, title: true },
    });
    if (!job) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Offre introuvable.' },
        404,
      );
    }
    await this.prisma.client.job.update({
      where: { id: jobId },
      data: { status: 'SUSPENDED' },
    });
    await this.prisma.client.auditLog.create({
      data: {
        actorId,
        action: 'JOB_SUSPENDED',
        entityType: 'job',
        entityId: jobId,
        metadata: { reason: motif, previousStatus: job.status },
      },
    });
    return { id: jobId, status: 'SUSPENDED' };
  }

  async patchCommune(
    actorId: string,
    communeId: string,
    isActive: boolean,
  ): Promise<{ id: string; isActive: boolean }> {
    const commune = await this.prisma.client.commune.findUnique({
      where: { id: communeId },
      select: { id: true },
    });
    if (!commune) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Commune introuvable.' },
        404,
      );
    }
    await this.prisma.client.commune.update({
      where: { id: communeId },
      data: { isActive },
    });
    await this.prisma.client.auditLog.create({
      data: {
        actorId,
        action: 'COMMUNE_PATCHED',
        entityType: 'commune',
        entityId: communeId,
        metadata: { isActive },
      },
    });
    return { id: communeId, isActive };
  }
}
