import pg from 'pg';

export { createPrismaClient, type PrismaClient } from './client';
export {
  runSeed,
  seedReferentiel,
  seedDemoAccounts,
  CATEGORIES,
  COMMUNE_NAMES,
  DEMO_ACTIVE_COMMUNES,
  FORBIDDEN_TERMS,
  CITY_NAME,
} from './seed/index';

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
