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
  countOccupied,
  expireOfferInTx,
  expireSelectionOffer,
  insertInAppNotifications,
  lockJobRow,
  sweepExpiredOffers,
  EXPIRE_JOB,
  SELECTION_QUEUE,
  type InAppNotification,
} from './selection';
export {
  matchMismatch,
  profileMatchesJob,
  runJobMatch,
  MATCH_JOB,
  MATCH_QUEUE,
  type MatchCandidate,
  type MatchJob,
  type MatchRunResult,
} from './matching';
export {
  startsInLabel,
  sweepMissionReminders,
  REMINDER_QUEUE,
  REMINDER_SWEEP,
  REMINDER_SWEEP_EVERY_MS,
} from './reminders';
export { jobFacts, jobPlace, kinshasaWeekdaySlot, kinshasaWhen, payLabel, type JobFacts } from './notification-text';
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
