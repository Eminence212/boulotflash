import { Worker } from 'bullmq';
import { MATCH_JOB, MATCH_QUEUE, runJobMatch, type PrismaClient } from '@boulotflash/database';
import { createWorkerClock } from '../clock';

/**
 * Consommateur BullMQ `match-profiles` (étape 18) : alerte in-app des profils qui correspondent à une
 * offre au premier passage en PUBLISHED. Le job attend dans Redis si le worker est arrêté et part à
 * son retour ; un rejeu n’écrit aucun doublon (unicités alerte et notification).
 */
export function startMatchProfilesWorker(prisma: PrismaClient, redisUrl: string): Worker {
  const clock = createWorkerClock(redisUrl);
  const worker = new Worker(
    MATCH_QUEUE,
    async (job) => {
      if (job.name !== MATCH_JOB) return { skipped: job.name };
      const jobId = String((job.data as { jobId?: unknown }).jobId ?? '');
      if (!jobId) return { skipped: 'no-job-id' };
      return runJobMatch(prisma, jobId, await clock.now());
    },
    { connection: { url: redisUrl, maxRetriesPerRequest: null }, concurrency: 2 },
  );
  worker.on('failed', (job, err) => {
    console.error(`match-profiles: job ${job?.id ?? '?'} en échec : ${err.message}`);
  });
  worker.on('closed', () => clock.close());
  return worker;
}
