import { Worker } from 'bullmq';
import {
  EXPIRE_JOB,
  SELECTION_QUEUE,
  expireSelectionOffer,
  type PrismaClient,
} from '@boulotflash/database';
import { createWorkerClock } from '../clock';

/**
 * Consommateur BullMQ : expire une proposition à `expires_at` (étape 16).
 * L’effet est idempotent (PENDING → EXPIRED sous verrou de l’offre) : une reprise BullMQ,
 * un balayage ou une acceptation concurrente ne produisent ni double statut ni double notification.
 */
export function startSelectionExpiryWorker(prisma: PrismaClient, redisUrl: string): Worker {
  const clock = createWorkerClock(redisUrl);
  const worker = new Worker(
    SELECTION_QUEUE,
    async (job) => {
      if (job.name !== EXPIRE_JOB) return { skipped: job.name };
      const offerId = String((job.data as { offerId?: unknown }).offerId ?? '');
      if (!offerId) return { skipped: 'no-offer-id' };
      const expired = await expireSelectionOffer(prisma, offerId, await clock.now());
      return { offerId, expired };
    },
    { connection: { url: redisUrl, maxRetriesPerRequest: null }, concurrency: 5 },
  );
  worker.on('failed', (job, err) => {
    console.error(`selection-offers: job ${job?.id ?? '?'} en échec : ${err.message}`);
  });
  worker.on('closed', () => clock.close());
  return worker;
}
