import { createHash, randomBytes } from 'node:crypto';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { LEGAL_DOCS_VERSION } from '@boulotflash/database';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from './jwt.service';
import { maskEmail } from './mask';
import { isInDrc, roundCoord } from '../geo/user-location';
import { clientAvatarUrl } from './oauth-picture';
import { isPilotPhone, normalizePilotPhone } from './phone';
import { ProfileService } from './profile.service';

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
    private readonly profiles: ProfileService,
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
    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt < new Date() ||
      existing.userAgent === 'admin-session'
    ) {
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

  /**
   * Enregistre majorité + acceptation CONDITIONS et CONFIDENTIALITÉ (v0.1).
   */
  async recordLegalAcceptance(userId: string): Promise<void> {
    const docs = await this.prisma.client.termsDocument.findMany({
      where: {
        version: LEGAL_DOCS_VERSION,
        kind: { in: ['TERMS', 'PRIVACY'] },
        publishedAt: { not: null },
      },
    });
    if (docs.length < 2) {
      throw new HttpException(
        {
          code: 'TERMS_MISSING',
          message: 'Documents juridiques indisponibles. Relancez le seed.',
        },
        503,
      );
    }
    const now = new Date();
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { ageConfirmedAt: now },
    });
    for (const doc of docs) {
      await this.prisma.client.termsAcceptance.upsert({
        where: {
          userId_termsDocumentId: {
            userId,
            termsDocumentId: doc.id,
          },
        },
        create: {
          userId,
          termsDocumentId: doc.id,
          acceptedAt: now,
        },
        update: { acceptedAt: now },
      });
    }
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
        locationLatitude: true,
        locationLongitude: true,
        locationConsentAt: true,
        createdAt: true,
        roles: { select: { role: true } },
        subscription: {
          select: { status: true, endsAt: true, startedAt: true },
        },
        authIdentities: {
          select: { provider: true, providerUserId: true, createdAt: true },
        },
      },
    });
    if (!user) {
      throw new HttpException({ code: 'UNAUTHORIZED', message: 'Session invalide.' }, 401);
    }

    const [workerProfile, employerProfile] = await Promise.all([
      this.profiles.getWorkerProfileView(userId),
      this.profiles.getEmployerProfileView(userId),
    ]);
    const worker = this.profiles.workerCompleteness(
      workerProfile
        ? {
            displayName: workerProfile.displayName,
            communeId: workerProfile.communeId,
            mainCategoryId: workerProfile.mainCategoryId,
            availability: workerProfile.availability,
          }
        : null,
    );

    const roles = user.roles.map((r) => r.role);
    const hasWorker = !!workerProfile;
    const hasEmployer = !!employerProfile;
    const missingBase = {
      phone: !user.phone,
      displayName: !user.displayName,
    };
    const gaps: string[] = [];
    if (missingBase.phone) gaps.push('Téléphone');
    if (missingBase.displayName) gaps.push('Nom');
    if (hasWorker || roles.includes('WORKER')) {
      gaps.push(...worker.gaps.filter((g) => !gaps.includes(g)));
    }

    let activeMode = user.activeMode;
    if (!activeMode) {
      if (hasEmployer && !hasWorker) activeMode = 'EMPLOYER';
      else if (hasWorker) activeMode = 'WORKER';
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      avatarUrl: clientAvatarUrl(user.id, user.avatarUrl),
      locationShared:
        user.locationConsentAt != null &&
        user.locationLatitude != null &&
        user.locationLongitude != null,
      status: user.status,
      phoneConfirmedAt: user.phoneConfirmedAt,
      ageConfirmedAt: user.ageConfirmedAt,
      activeMode,
      createdAt: user.createdAt,
      authIdentities: user.authIdentities,
      roles,
      modesAvailable: {
        worker: hasWorker,
        employer: hasEmployer,
        canSwitch: hasWorker && hasEmployer,
      },
      workerProfile,
      employerProfile,
      subscription: user.subscription
        ? {
            status: user.subscription.status,
            endsAt: user.subscription.endsAt,
            startedAt: user.subscription.startedAt,
            label:
              user.subscription.status === 'ACTIVE'
                ? 'Services gratuits'
                : user.subscription.status === 'EXPIRED'
                  ? 'Abonnement expiré'
                  : 'Abonnement suspendu',
          }
        : null,
      missing: {
        ...missingBase,
        workerCommune: worker.flags.commune,
        workerCategory: worker.flags.category,
        workerAvailability: worker.flags.availability,
      },
      gaps,
      workerProfileComplete: worker.complete,
      needsProfileCompletion: missingBase.phone || missingBase.displayName,
      phoneBadge: !!user.phone,
    };
  }

  async patchMe(
    userId: string,
    body: {
      displayName?: string;
      phone?: string;
      avatarUrl?: string | null;
    },
  ) {
    const data: {
      displayName?: string;
      phone?: string;
      phoneConfirmedAt?: Date;
      avatarUrl?: string | null;
      status?: 'ACTIVE' | 'INCOMPLETE';
    } = {};

    if (body.displayName !== undefined) {
      const name = body.displayName.trim();
      if (name.length < 2 || name.length > 80) {
        throw new HttpException(
          {
            code: 'VALIDATION',
            message: 'Le nom doit faire entre 2 et 80 caractères.',
          },
          400,
        );
      }
      data.displayName = name;
    }

    if (body.phone !== undefined) {
      const phone = normalizePilotPhone(body.phone);
      if (!phone || !isPilotPhone(phone)) {
        throw new HttpException(
          {
            code: 'VALIDATION',
            message: 'Téléphone invalide. Format pilote : +243 suivi de 9 chiffres.',
          },
          400,
        );
      }
      const taken = await this.prisma.client.user.findFirst({
        where: { phone, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) {
        throw new HttpException(
          {
            code: 'PHONE_TAKEN',
            message: 'Ce numéro est déjà utilisé par un autre compte.',
          },
          409,
        );
      }
      data.phone = phone;
      data.phoneConfirmedAt = new Date();
    }

    if (body.avatarUrl !== undefined) {
      data.avatarUrl = body.avatarUrl;
    }

    if (Object.keys(data).length === 0) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Aucun champ à mettre à jour.' },
        400,
      );
    }

    const current = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { phone: true, displayName: true },
    });
    if (!current) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Session invalide.' },
        401,
      );
    }
    const nextPhone = data.phone ?? current.phone;
    const nextName = data.displayName ?? current.displayName;
    if (nextPhone && nextName) {
      data.status = 'ACTIVE';
    }

    await this.prisma.client.user.update({ where: { id: userId }, data });
    return this.getUserForMe(userId);
  }

  /**
   * Enregistre ou retire la position actuelle. Pas d’historique :
   * un nouvel accord remplace les coordonnées précédentes.
   */
  async setCurrentLocation(
    userId: string,
    body: { consent?: boolean; latitude?: number; longitude?: number },
  ) {
    if (body.consent !== true) {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          locationLatitude: null,
          locationLongitude: null,
          locationConsentAt: null,
          locationUpdatedAt: null,
        },
      });
      return this.getUserForMe(userId);
    }

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!isInDrc(latitude, longitude)) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message:
            'La position doit se trouver en République démocratique du Congo.',
        },
        400,
      );
    }

    const now = new Date();
    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        locationLatitude: roundCoord(latitude),
        locationLongitude: roundCoord(longitude),
        locationConsentAt: now,
        locationUpdatedAt: now,
      },
    });
    return this.getUserForMe(userId);
  }

  async assertHasPhone(userId: string): Promise<void> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!user?.phone) {
      throw new HttpException(
        {
          code: 'PHONE_REQUIRED',
          message:
            'Un numéro de téléphone est requis avant de postuler ou publier. Renseignez-le dans votre profil.',
        },
        403,
      );
    }
  }
}
