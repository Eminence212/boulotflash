import pg from 'pg';

export {
  createPrismaClient,
  type AvailabilitySlot,
  type EmployerType,
  type JobStatus,
  type Prisma,
  type PrismaClient,
} from './client';
export {
  runSeed,
  seedReferentiel,
  seedDemoAccounts,
  seedLegalDocuments,
  LEGAL_DOCS_VERSION,
  CATEGORIES,
  COMMUNE_NAMES,
  DEMO_ACTIVE_COMMUNES,
  FORBIDDEN_TERMS,
  CITY_NAME,
} from './seed/index';
export {
  base32Decode,
  base32Encode,
  decryptTotpSecret,
  encodeTotpSecretForStorage,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpCode,
  generateTotpSecret,
  isTotpAdapterFixed,
  loadTotpEncryptionKey,
  verifyTotpCode,
  TOTP_TEST_SECRET_DEFAULT,
} from './totp-crypto';

/**
 * Ping Postgres pour /health (étape 04).
 */
export async function pingPostgres(databaseUrl: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}
