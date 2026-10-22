import { createPrismaClient } from '@boulotflash/database';
import { DomainError } from '../domain-error';
import { linkOauthProvider, resolveOauthLogin } from '../oauth-account';
import type { VerifiedOauthProfile } from '../oauth-types';
import { normalizePilotPhone } from '../phone';

const hasDb = !!process.env.DATABASE_URL;
const describeDb = hasDb ? describe : describe.skip;

function profile(
  overrides: Partial<VerifiedOauthProfile> &
    Pick<VerifiedOauthProfile, 'provider' | 'providerUserId'>,
): VerifiedOauthProfile {
  return {
    email: null,
    emailVerified: false,
    displayName: null,
    avatarUrl: null,
    phoneE164: null,
    ...overrides,
  };
}

describeDb('resolveOauthLogin (étape 09 fixtures)', () => {
  const db = createPrismaClient();
  const createdUserIds: string[] = [];

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await db.authIdentity.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await db.termsAcceptance.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await db.refreshToken.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await db.userRole.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await db.$disconnect();
  });

  it('crée un user Google puis le rouvre', async () => {
    const sub = `g-create-${Date.now()}`;
    const email = `oauth-create-${Date.now()}@example.com`;
    const first = await resolveOauthLogin(
      db,
      profile({
        provider: 'google',
        providerUserId: sub,
        email,
        emailVerified: true,
        displayName: 'Alice Test',
      }),
    );
    createdUserIds.push(first.userId);

    const second = await resolveOauthLogin(
      db,
      profile({
        provider: 'google',
        providerUserId: sub,
        email,
        emailVerified: true,
      }),
    );
    expect(second.userId).toBe(first.userId);

    const identity = await db.authIdentity.findUnique({
      where: {
        provider_providerUserId: { provider: 'google', providerUserId: sub },
      },
    });
    expect(identity?.userId).toBe(first.userId);
  });

  it('rattache Facebook au même e-mail vérifié sans second user', async () => {
    const email = `oauth-link-${Date.now()}@example.com`;
    const google = await resolveOauthLogin(
      db,
      profile({
        provider: 'google',
        providerUserId: `g-${Date.now()}`,
        email,
        emailVerified: true,
        displayName: 'Bob',
      }),
    );
    createdUserIds.push(google.userId);

    const fb = await resolveOauthLogin(
      db,
      profile({
        provider: 'facebook',
        providerUserId: `fb-${Date.now()}`,
        email,
        emailVerified: true,
      }),
    );
    expect(fb.userId).toBe(google.userId);

    const count = await db.authIdentity.count({
      where: { userId: google.userId },
    });
    expect(count).toBe(2);
  });

  it('refuse e-mail Google non vérifié', async () => {
    await expect(
      resolveOauthLogin(
        db,
        profile({
          provider: 'google',
          providerUserId: `g-unverified-${Date.now()}`,
          email: `unverified-${Date.now()}@example.com`,
          emailVerified: false,
        }),
      ),
    ).rejects.toBeInstanceOf(DomainError);

    await expect(
      resolveOauthLogin(
        db,
        profile({
          provider: 'google',
          providerUserId: `g-unverified2-${Date.now()}`,
          email: `unverified2-${Date.now()}@example.com`,
          emailVerified: false,
        }),
      ),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
  });

  it('link → OAUTH_ACCOUNT_TAKEN si provider déjà pris', async () => {
    const a = await resolveOauthLogin(
      db,
      profile({
        provider: 'google',
        providerUserId: `g-a-${Date.now()}`,
        email: `a-${Date.now()}@example.com`,
        emailVerified: true,
      }),
    );
    createdUserIds.push(a.userId);
    const takenSub = `g-taken-${Date.now()}`;
    const b = await resolveOauthLogin(
      db,
      profile({
        provider: 'google',
        providerUserId: takenSub,
        email: `b-${Date.now()}@example.com`,
        emailVerified: true,
      }),
    );
    createdUserIds.push(b.userId);

    await expect(
      linkOauthProvider(
        db,
        a.userId,
        profile({
          provider: 'google',
          providerUserId: takenSub,
          email: `b-taken@example.com`,
          emailVerified: true,
        }),
      ),
    ).rejects.toMatchObject({ code: 'OAUTH_ACCOUNT_TAKEN' });
  });

  it('refuse OAuth sur un compte ADMIN', async () => {
    const email = `admin-${Date.now()}@example.com`;
    const user = await db.user.create({
      data: {
        email,
        status: 'ACTIVE',
        roles: { create: { role: 'ADMIN', adminScope: 'SUPPORT' } },
      },
    });
    createdUserIds.push(user.id);

    await expect(
      resolveOauthLogin(
        db,
        profile({
          provider: 'google',
          providerUserId: `g-admin-${Date.now()}`,
          email,
          emailVerified: true,
        }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('normalizePilotPhone', () => {
  it('accepte +243 et formats locaux', () => {
    expect(normalizePilotPhone('+243812345678')).toBe('+243812345678');
    expect(normalizePilotPhone('0812345678')).toBe('+243812345678');
    expect(normalizePilotPhone('812345678')).toBe('+243812345678');
    expect(normalizePilotPhone('123')).toBeNull();
  });
});
