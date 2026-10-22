import type { PrismaClient } from '@prisma/client';
import { seedDemoAccounts } from './demo-accounts';
import { seedReferentiel } from './referentiel';

export { seedReferentiel } from './referentiel';
export { seedDemoAccounts } from './demo-accounts';
export { seedLegalDocuments, LEGAL_DOCS_VERSION } from './legal-docs';
export {
  CATEGORIES,
  COMMUNE_NAMES,
  DEMO_ACTIVE_COMMUNES,
  FORBIDDEN_TERMS,
  CITY_NAME,
} from './data';

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export type RunSeedOptions = {
  /** Défaut : process.env */
  env?: NodeJS.ProcessEnv;
  /** Si false, n’écrit jamais les comptes démo (bootstrap API). Défaut true pour CLI. */
  allowDemoAccounts?: boolean;
};

/**
 * Référentiel toujours. Communes démo / comptes selon drapeaux env.
 */
export async function runSeed(
  prisma: PrismaClient,
  options: RunSeedOptions = {},
): Promise<void> {
  const env = options.env ?? process.env;
  const allowDemoAccounts = options.allowDemoAccounts !== false;

  await seedReferentiel(prisma, {
    activateDemoCommunes: isTruthy(env.SEED_ACTIVATE_DEMO_COMMUNES),
  });

  if (allowDemoAccounts && isTruthy(env.SEED_DEMO)) {
    await seedDemoAccounts(prisma);
  }
}
