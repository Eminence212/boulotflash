import { Queue, Worker } from 'bullmq';
import {
  REMINDER_QUEUE,
  REMINDER_SWEEP,
  REMINDER_SWEEP_EVERY_MS,
  sweepMissionReminders,
  type PrismaClient,
} from '@boulotflash/database';
import { createWorkerClock } from '../clock';

/**
 * Rappels de mission in-app (étape 19, D16). Un planificateur BullMQ lance le balayage chaque minute ;
 * un rappel manqué pendant un arrêt du worker part au retour, tant que la mission n’a pas commencé.
 */
export async function startMissionReminderWorker(
  prisma: PrismaClient,
  redisUrl: string,
): Promise<{ close: () => Promise<void> }> {
  const connection = { url: redisUrl, maxRetriesPerRequest: null };
  const queue = new Queue(REMINDER_QUEUE, { connection });
  // Planificateur idempotent : un redémarrage remplace l’entrée au lieu d’en ajouter une.
  await queue.upsertJobScheduler(
    'mission-reminder-sweep',
    { every: REMINDER_SWEEP_EVERY_MS },
    { name: REMINDER_SWEEP, opts: { removeOnComplete: 100, removeOnFail: 100 } },
  );
  const clock = createWorkerClock(redisUrl);
  const worker = new Worker(
    REMINDER_QUEUE,
    async (job) => {
      if (job.name !== REMINDER_SWEEP) return { skipped: job.name };
      return sweepMissionReminders(prisma, await clock.now());
    },
    { connection, concurrency: 1 },
  );
  worker.on('failed', (job, err) => {
    console.error(`mission-reminders: job ${job?.id ?? '?'} en échec : ${err.message}`);
  });
  return {
    async close() {
      await worker.close();
      await queue.close();
      clock.close();
    },
  };
}
