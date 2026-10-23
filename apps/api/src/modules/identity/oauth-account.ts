import type { PrismaClient } from '@boulotflash/database';
import { DomainError } from './domain-error';
import { maskEmail } from './mask';
import { isProviderAvatarUrl } from './oauth-picture';
import type { VerifiedOauthProfile } from './oauth-types';
import { normalizePilotPhone } from './phone';

/**
 * Résolution de compte OAuth (D33) — logique pure, testable sans Nest.
 */
export async function resolveOauthLogin(
  db: PrismaClient,
  profile: VerifiedOauthProfile,
  log: (msg: string) => void = () => undefined,
): Promise<{ userId: string }> {
  assertNotUnverifiedEmail(profile);

  const byIdentity = await db.authIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      },
    },
    include: { user: { include: { roles: true } } },
  });

  if (byIdentity) {
    assertNotAdminUser(byIdentity.user.roles);
    await applyProviderFields(db, byIdentity.userId, profile);
    return { userId: byIdentity.userId };
  }

  if (profile.email && profile.emailVerified) {
    const byEmail = await db.user.findFirst({
      where: { email: profile.email },
      include: { roles: true },
    });
    if (byEmail) {
      assertNotAdminUser(byEmail.roles);
      await db.authIdentity.create({
        data: {
          userId: byEmail.id,
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      });
      await applyProviderFields(db, byEmail.id, profile);
      log(`liaison e-mail ${maskEmail(profile.email)} + ${profile.provider}`);
      return { userId: byEmail.id };
    }
  }

  const phone = profile.phoneE164
    ? normalizePilotPhone(profile.phoneE164)
    : null;
  const user = await db.user.create({
    data: {
      email: profile.emailVerified ? profile.email : null,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      phone,
      phoneConfirmedAt: phone ? new Date() : null,
      status: 'INCOMPLETE',
      locale: 'fr',
      authIdentities: {
        create: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
    },
  });
  log(`user créé via ${profile.provider} email=${maskEmail(user.email)}`);
  return { userId: user.id };
}

export async function linkOauthProvider(
  db: PrismaClient,
  userId: string,
  profile: VerifiedOauthProfile,
): Promise<void> {
  assertNotUnverifiedEmail(profile);

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!user) {
    throw new DomainError('UNAUTHORIZED', 'Session invalide.', 401);
  }
  assertNotAdminUser(user.roles);

  const existing = await db.authIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      },
    },
  });
  if (existing) {
    if (existing.userId === userId) return;
    throw new DomainError(
      'OAUTH_ACCOUNT_TAKEN',
      'Ce compte provider est déjà lié à un autre utilisateur.',
      409,
    );
  }

  await db.authIdentity.create({
    data: {
      userId,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
    },
  });
  await applyProviderFields(db, userId, profile);
}

function assertNotUnverifiedEmail(profile: VerifiedOauthProfile): void {
  if (profile.provider === 'google') {
    const policy = (process.env.GOOGLE_EMAIL_POLICY ?? 'verified_google')
      .trim()
      .toLowerCase();
    if (policy === 'verified_google' && (!profile.email || !profile.emailVerified)) {
      throw new DomainError(
        'EMAIL_NOT_VERIFIED',
        'E-mail Google non vérifié — connexion refusée.',
        409,
      );
    }
  }
}

function assertNotAdminUser(roles: { role: string }[]): void {
  if (roles.some((r) => r.role === 'ADMIN')) {
    throw new DomainError(
      'FORBIDDEN',
      'Les comptes internes ne se connectent pas via OAuth (D35).',
      403,
    );
  }
}

async function applyProviderFields(
  db: PrismaClient,
  userId: string,
  profile: VerifiedOauthProfile,
): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const data: {
    email?: string;
    displayName?: string;
    avatarUrl?: string;
    phone?: string;
    phoneConfirmedAt?: Date;
  } = {};

  if (profile.email && profile.emailVerified && !user.email) {
    data.email = profile.email;
  }
  if (profile.displayName && !user.displayName) {
    data.displayName = profile.displayName;
  }
  if (
    profile.avatarUrl &&
    profile.avatarUrl !== user.avatarUrl &&
    (!user.avatarUrl || isProviderAvatarUrl(user.avatarUrl))
  ) {
    data.avatarUrl = profile.avatarUrl;
  }
  const phone = profile.phoneE164
    ? normalizePilotPhone(profile.phoneE164)
    : null;
  if (phone && !user.phone) {
    data.phone = phone;
    data.phoneConfirmedAt = new Date();
  }

  if (Object.keys(data).length === 0) return;
  await db.user.update({ where: { id: userId }, data });
}
