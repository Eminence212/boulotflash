import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import type { AuthProvider, PrismaClient } from '@prisma/client';
import {
  encodeTotpSecretForStorage,
  isTotpAdapterFixed,
} from '../totp-crypto';
import {
  ADMIN_PASSWORD,
  CLOSED_PHONE_C_FERME,
  RECOVERY_CODE_TEST,
  TOTP_TEST_SECRET,
} from './data';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Comptes démo (jeux-de-donnees.md). Idempotent sur e-mail / username / provider_user_id.
 * Pas d’offres J-*.
 */
export async function seedDemoAccounts(prisma: PrismaClient): Promise<void> {
  const passwordHash = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });

  const gombe = await prisma.commune.findFirst({ where: { name: 'Gombe' } });
  const ngaliema = await prisma.commune.findFirst({ where: { name: 'Ngaliema' } });
  const lemba = await prisma.commune.findFirst({ where: { name: 'Lemba' } });
  const catVente = await prisma.category.findFirst({
    where: { slug: 'vente-promotion-et-distribution' },
  });
  const catDemo = await prisma.category.findFirst({
    where: { slug: 'demenagement-et-chargement' },
  });

  if (!gombe || !ngaliema || !lemba || !catVente || !catDemo) {
    throw new Error(
      'seedDemoAccounts: référentiel incomplet (communes / catégories). Lancez seedReferentiel d’abord.',
    );
  }

  async function upsertPublicUser(input: {
    code: string;
    email?: string | null;
    phone?: string | null;
    displayName: string;
    status?: 'ACTIVE' | 'INCOMPLETE' | 'SUSPENDED' | 'CLOSED';
    provider: AuthProvider;
    providerUserId: string;
  }) {
    const existingIdentity = await prisma.authIdentity.findFirst({
      where: {
        provider: input.provider,
        providerUserId: input.providerUserId,
      },
    });
    if (existingIdentity) {
      return prisma.user.update({
        where: { id: existingIdentity.userId },
        data: {
          email: input.email ?? undefined,
          phone: input.phone ?? undefined,
          displayName: input.displayName,
          status: input.status ?? 'ACTIVE',
        },
      });
    }

    // Idempotence si le téléphone / e-mail existe déjà (re-seed, OAuth partiel).
    const existingUser =
      (input.phone
        ? await prisma.user.findFirst({ where: { phone: input.phone } })
        : null) ??
      (input.email
        ? await prisma.user.findFirst({ where: { email: input.email } })
        : null);

    if (existingUser) {
      await prisma.authIdentity.upsert({
        where: {
          provider_providerUserId: {
            provider: input.provider,
            providerUserId: input.providerUserId,
          },
        },
        create: {
          userId: existingUser.id,
          provider: input.provider,
          providerUserId: input.providerUserId,
        },
        update: {},
      });
      return prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: input.email ?? undefined,
          phone: input.phone ?? undefined,
          displayName: input.displayName,
          status: input.status ?? 'ACTIVE',
          phoneConfirmedAt: input.phone ? new Date() : undefined,
        },
      });
    }

    return prisma.user.create({
      data: {
        email: input.email ?? null,
        phone: input.phone ?? null,
        displayName: input.displayName,
        status: input.status ?? 'ACTIVE',
        phoneConfirmedAt: input.phone ? new Date() : null,
        ageConfirmedAt: new Date(),
        authIdentities: {
          create: {
            provider: input.provider,
            providerUserId: input.providerUserId,
          },
        },
        roles: { create: { role: 'WORKER' } },
      },
    });
  }

  const cComplet = await upsertPublicUser({
    code: 'C-COMPLET',
    email: 'complet@demo.boulotflash.test',
    phone: '+243810000001',
    displayName: 'Grâce',
    provider: 'google',
    providerUserId: 'google-sub-complet',
  });
  await prisma.userRole.upsert({
    where: { userId_role: { userId: cComplet.id, role: 'WORKER' } },
    create: { userId: cComplet.id, role: 'WORKER' },
    update: {},
  });
  await prisma.workerProfile.upsert({
    where: { userId: cComplet.id },
    create: {
      userId: cComplet.id,
      displayName: 'Grâce',
      communeId: lemba.id,
      mainCategoryId: catVente.id,
      termsAcceptedAt: new Date(),
      isAvailable: true,
    },
    update: {
      communeId: lemba.id,
      mainCategoryId: catVente.id,
      isAvailable: true,
    },
  });

  const cIncomplet = await upsertPublicUser({
    code: 'C-INCOMPLET',
    email: 'incomplet@demo.boulotflash.test',
    phone: '+243810000002',
    displayName: 'Incomplet',
    status: 'INCOMPLETE',
    provider: 'google',
    providerUserId: 'google-sub-incomplet',
  });
  await prisma.workerProfile.upsert({
    where: { userId: cIncomplet.id },
    create: {
      userId: cIncomplet.id,
      displayName: 'Incomplet',
      communeId: null,
      mainCategoryId: null,
    },
    update: { communeId: null, mainCategoryId: null },
  });

  const cA = await upsertPublicUser({
    code: 'C-A',
    phone: '+243810000003',
    displayName: 'Patrick',
    provider: 'facebook',
    providerUserId: 'fb-sub-a',
  });
  await prisma.workerProfile.upsert({
    where: { userId: cA.id },
    create: {
      userId: cA.id,
      displayName: 'Patrick',
      communeId: ngaliema.id,
      mainCategoryId: catDemo.id,
      isAvailable: true,
      termsAcceptedAt: new Date(),
    },
    update: {
      communeId: ngaliema.id,
      mainCategoryId: catDemo.id,
      isAvailable: true,
    },
  });

  const cB = await upsertPublicUser({
    code: 'C-B',
    phone: '+243810000004',
    displayName: 'Sarah',
    provider: 'instagram',
    providerUserId: 'ig-sub-b',
  });
  await prisma.workerProfile.upsert({
    where: { userId: cB.id },
    create: {
      userId: cB.id,
      displayName: 'Sarah',
      communeId: ngaliema.id,
      mainCategoryId: catDemo.id,
      isAvailable: true,
      termsAcceptedAt: new Date(),
    },
    update: {
      communeId: ngaliema.id,
      mainCategoryId: catDemo.id,
      isAvailable: true,
    },
  });

  const cNoPhone = await upsertPublicUser({
    code: 'C-NOPHONE',
    email: 'grace.demo@gmail.com',
    phone: null,
    displayName: 'Grâce (sans tél.)',
    provider: 'google',
    providerUserId: 'google-sub-grace',
  });
  await prisma.workerProfile.upsert({
    where: { userId: cNoPhone.id },
    create: {
      userId: cNoPhone.id,
      displayName: 'Grâce (sans tél.)',
      communeId: lemba.id,
      mainCategoryId: catVente.id,
    },
    update: { communeId: lemba.id, mainCategoryId: catVente.id },
  });

  // C-FERME : compte fermé + identifiant téléphone en empreinte
  let cFerme = await prisma.user.findFirst({
    where: { displayName: 'C-FERME', status: 'CLOSED' },
  });
  if (!cFerme) {
    cFerme = await prisma.user.create({
      data: {
        displayName: 'C-FERME',
        status: 'CLOSED',
        roles: { create: { role: 'WORKER' } },
      },
    });
  }
  const phoneHash = sha256Hex(CLOSED_PHONE_C_FERME);
  const existingClosed = await prisma.closedIdentifier.findFirst({
    where: { kind: 'PHONE', valueHash: phoneHash },
  });
  if (!existingClosed) {
    const closedAt = new Date();
    const reusableAt = new Date(closedAt);
    reusableAt.setDate(reusableAt.getDate() + 90);
    await prisma.closedIdentifier.create({
      data: {
        kind: 'PHONE',
        valueHash: phoneHash,
        closedAt,
        reusableAt,
      },
    });
  }

  async function upsertEmployer(input: {
    code: string;
    email?: string | null;
    phone: string;
    displayName: string;
    provider: 'google' | 'facebook';
    providerUserId: string;
    communeId: string;
    type: 'INDIVIDUAL' | 'BUSINESS';
    status?: 'ACTIVE' | 'SUSPENDED';
    subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
    alsoWorker?: boolean;
  }) {
    let user = await prisma.user.findFirst({
      where: {
        authIdentities: {
          some: { provider: input.provider, providerUserId: input.providerUserId },
        },
      },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: input.email ?? null,
          phone: input.phone,
          displayName: input.displayName,
          status: input.status ?? 'ACTIVE',
          phoneConfirmedAt: new Date(),
          ageConfirmedAt: new Date(),
          authIdentities: {
            create: {
              provider: input.provider,
              providerUserId: input.providerUserId,
            },
          },
          roles: {
            create: input.alsoWorker
              ? [{ role: 'EMPLOYER' }, { role: 'WORKER' }]
              : [{ role: 'EMPLOYER' }],
          },
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          phone: input.phone,
          displayName: input.displayName,
          status: input.status ?? 'ACTIVE',
        },
      });
      await prisma.userRole.upsert({
        where: { userId_role: { userId: user.id, role: 'EMPLOYER' } },
        create: { userId: user.id, role: 'EMPLOYER' },
        update: {},
      });
    }

    await prisma.employerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        type: input.type,
        displayName: input.displayName,
        communeId: input.communeId,
        phoneConfirmed: true,
      },
      update: {
        communeId: input.communeId,
        displayName: input.displayName,
        phoneConfirmed: true,
      },
    });

    await prisma.subscription.upsert({
      where: { employerId: user.id },
      create: {
        employerId: user.id,
        status: input.subscriptionStatus ?? 'ACTIVE',
      },
      update: {
        status: input.subscriptionStatus ?? 'ACTIVE',
      },
    });

    return user;
  }

  await upsertEmployer({
    code: 'R-1',
    phone: '+243820000001',
    displayName: 'Restaurant',
    provider: 'google',
    providerUserId: 'google-sub-r1',
    communeId: gombe.id,
    type: 'BUSINESS',
  });
  await upsertEmployer({
    code: 'R-2',
    phone: '+243820000002',
    displayName: 'Boutique',
    provider: 'facebook',
    providerUserId: 'fb-sub-r2',
    communeId: ngaliema.id,
    type: 'BUSINESS',
  });
  await upsertEmployer({
    code: 'R-DUAL',
    phone: '+243830000001',
    displayName: 'Dual',
    provider: 'google',
    providerUserId: 'google-sub-rdual',
    communeId: gombe.id,
    type: 'INDIVIDUAL',
    alsoWorker: true,
  });
  await upsertEmployer({
    code: 'R-SUSPENDU',
    phone: '+243820000003',
    displayName: 'Suspendu',
    provider: 'google',
    providerUserId: 'google-sub-rsusp',
    communeId: gombe.id,
    type: 'INDIVIDUAL',
    status: 'SUSPENDED',
  });
  await upsertEmployer({
    code: 'R-ABO-EXPIRE',
    phone: '+243820000004',
    displayName: 'Abo expiré',
    provider: 'google',
    providerUserId: 'google-sub-rexp',
    communeId: gombe.id,
    type: 'INDIVIDUAL',
    subscriptionStatus: 'EXPIRED',
  });

  const admins: Array<{
    username: string;
    scope: 'SUPPORT' | 'MODERATOR' | 'FINANCE' | 'SUPER';
  }> = [
    { username: 'support', scope: 'SUPPORT' },
    { username: 'modo', scope: 'MODERATOR' },
    { username: 'finance', scope: 'FINANCE' },
    { username: 'super', scope: 'SUPER' },
  ];

  for (const admin of admins) {
    let user = await prisma.user.findFirst({ where: { username: admin.username } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: admin.username,
          passwordHash,
          displayName: admin.username,
          status: 'ACTIVE',
          roles: {
            create: { role: 'ADMIN', adminScope: admin.scope },
          },
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      await prisma.userRole.upsert({
        where: { userId_role: { userId: user.id, role: 'ADMIN' } },
        create: { userId: user.id, role: 'ADMIN', adminScope: admin.scope },
        update: { adminScope: admin.scope },
      });
    }

    if (isTotpAdapterFixed()) {
      const secretEncrypted = encodeTotpSecretForStorage(TOTP_TEST_SECRET);
      await prisma.adminTotpSecret.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          secretEncrypted,
          confirmedAt: new Date(),
        },
        update: { secretEncrypted, confirmedAt: new Date() },
      });
      const recoveryHash = sha256Hex(RECOVERY_CODE_TEST);
      const existingRecovery = await prisma.recoveryCode.findFirst({
        where: { userId: user.id, codeHash: recoveryHash },
      });
      if (!existingRecovery) {
        await prisma.recoveryCode.create({
          data: { userId: user.id, codeHash: recoveryHash },
        });
      }
    } else {
      console.info(
        `[seed] TOTP admin ${admin.username} ignoré (définir TOTP_ADAPTER=fixed pour le secret de test)`,
      );
    }
  }

  // Offre minimale J-PUB-1 pour la recette admin (10-F) — offre complète = étape 12.
  const catService = await prisma.category.findFirst({
    where: { slug: 'service-plonge-et-cuisine' },
  });
  if (catService) {
    const r2Identity = await prisma.authIdentity.findFirst({
      where: { provider: 'facebook', providerUserId: 'fb-sub-r2' },
    });
    if (r2Identity) {
      const existingJob = await prisma.job.findFirst({
        where: { title: { startsWith: 'J-PUB-1' } },
      });
      if (!existingJob) {
        const startAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const applyDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
        const selectionDeadline = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
        await prisma.job.create({
          data: {
            employerId: r2Identity.userId,
            title: 'J-PUB-1 — Service près du marché',
            description:
              'Offre démo pour recette admin (suspension). Parcours nominal Gombe.',
            categoryId: catService.id,
            communeId: gombe.id,
            publicLandmark: 'près du marché',
            addressPrivate: '10 avenue de test, Gombe',
            startAt,
            durationHours: 4,
            workersNeeded: 2,
            amount: 1500,
            currency: 'USD',
            payUnit: 'MISSION',
            payChannel: 'CASH',
            payTiming: 'fin de mission',
            applyDeadline,
            selectionDeadline,
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });
      }
    }
  }
}
