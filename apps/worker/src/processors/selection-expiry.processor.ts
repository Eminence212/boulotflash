import { Worker } from 'bullmq';
import Redis from 'ioredis';
import {
  EXPIRE_JOB,
  SELECTION_QUEUE,
  expireSelectionOffer,
  type PrismaClient,
} from '@boulotflash/database';

const CLOCK_OFFSET_KEY = 'test:clock:offset-ms';

function testHooksEnabled(): boolean {
  const value = process.env.ENABLE_TEST_HOOKS?.trim().toLowerCase();
  return !!value && ['1', 'true', 'yes', 'on'].includes(value);
}

/**
 * Consommateur BullMQ : expire une proposition à `expires_at` (étape 16).
 * L’effet est idempotent (PENDING → EXPIRED sous verrou de l’offre) : une reprise BullMQ,
 * un balayage ou une acceptation concurrente ne produisent ni double statut ni double notification.
 */
export function startSelectionExpiryWorker(prisma: PrismaClient, redisUrl: string): Worker {
  // Même horloge que l’API quand l’horloge de test est posée ; sinon l’heure réelle.
  const clock = testHooksEnabled() ? new Redis(redisUrl, { maxRetriesPerRequest: 1 }) : null;

  async function now(): Promise<Date> {
    if (!clock) return new Date();
    const raw = await clock.get(CLOCK_OFFSET_KEY).catch(() => null);
    const offset = raw === null ? 0 : Number(raw);
    return new Date(Date.now() + (Number.isFinite(offset) ? offset : 0));
  }

  const worker = new Worker(
    SELECTION_QUEUE,
    async (job) => {
      if (job.name !== EXPIRE_JOB) return { skipped: job.name };
      const offerId = String((job.data as { offerId?: unknown }).offerId ?? '');
      if (!offerId) return { skipped: 'no-offer-id' };
      const expired = await expireSelectionOffer(prisma, offerId, await now());
      return { offerId, expired };
    },
    { connection: { url: redisUrl, maxRetriesPerRequest: null }, concurrency: 5 },
  );
  worker.on('failed', (job, err) => {
    console.error(`selection-offers: job ${job?.id ?? '?'} en échec : ${err.message}`);
  });
  worker.on('closed', () => {
    clock?.disconnect();
  });
  return worker;
}
