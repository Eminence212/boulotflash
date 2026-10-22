/**
 * Bootstrap one-shot du premier super-admin (D35 / étape 10).
 *
 * Usage (hors production, ou avec CONFIRM_PRODUCTION_BOOTSTRAP=yes) :
 *   BOOTSTRAP_SUPER_USERNAME=super \
 *   BOOTSTRAP_SUPER_PASSWORD='…' \
 *   pnpm --filter @boulotflash/database bootstrap:super
 *
 * Affiche le secret TOTP et les codes de secours une seule fois (stdout).
 * Refusé s’il existe déjà un ADMIN SUPER.
 */
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { createPrismaClient } from '../client';
import {
  encodeTotpSecretForStorage,
  generateRecoveryCodes,
  generateTotpSecret,
} from '../totp-crypto';

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

async function main() {
  const appEnv = (process.env.APP_ENV ?? 'development').trim().toLowerCase();
  if (
    appEnv === 'production' &&
    !isTruthy(process.env.CONFIRM_PRODUCTION_BOOTSTRAP)
  ) {
    console.error(
      '[bootstrap-super] Refusé en production sans CONFIRM_PRODUCTION_BOOTSTRAP=yes.',
    );
    process.exit(1);
  }

  const username = (
    process.env.BOOTSTRAP_SUPER_USERNAME ?? 'super'
  ).trim().toLowerCase();
  const password = process.env.BOOTSTRAP_SUPER_PASSWORD?.trim();
  if (!password || password.length < 12) {
    console.error(
      '[bootstrap-super] BOOTSTRAP_SUPER_PASSWORD requis (≥ 12 caractères).',
    );
    process.exit(1);
  }

  const prisma = createPrismaClient();
  try {
    const existingSuper = await prisma.userRole.findFirst({
      where: { role: 'ADMIN', adminScope: 'SUPER' },
    });
    if (existingSuper) {
      console.error(
        '[bootstrap-super] Un SUPER existe déjà. Aucune création.',
      );
      process.exit(1);
    }

    const totpSecret = generateTotpSecret();
    const secretEncrypted = encodeTotpSecretForStorage(totpSecret);
    const recoveryCodes = generateRecoveryCodes(8);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        displayName: username,
        status: 'ACTIVE',
        roles: { create: { role: 'ADMIN', adminScope: 'SUPER' } },
        adminTotpSecret: {
          create: { secretEncrypted, confirmedAt: new Date() },
        },
        recoveryCodes: {
          create: recoveryCodes.map((c) => ({ codeHash: sha256Hex(c) })),
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'ADMIN_USER_CREATED',
        entityType: 'user',
        entityId: user.id,
        metadata: { username, adminScope: 'SUPER', bootstrap: true },
      },
    });

    console.log(JSON.stringify({
      id: user.id,
      username,
      adminScope: 'SUPER',
      totpSecret,
      recoveryCodes,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
