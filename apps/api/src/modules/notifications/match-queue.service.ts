import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MATCH_JOB, MATCH_QUEUE } from '@boulotflash/database';

/**
 * Producteur `match-profiles` (étape 18) : l’alerte de correspondance est mise en file pour ne pas
 * allonger la publication. Si Redis manque, l’offre reste publiée ; seule l’alerte ne part pas.
 */
@Injectable()
export class MatchQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(MatchQueueService.name);
  private readonly queue: Queue | null;

  constructor() {
    const url = process.env.REDIS_URL;
    this.queue = url
      ? new Queue(MATCH_QUEUE, {
          connection: { url, maxRetriesPerRequest: null },
          defaultJobOptions: {
            removeOnComplete: 1000,
            removeOnFail: 1000,
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
          },
        })
      : null;
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }

  /** À appeler seulement au premier passage en PUBLISHED. jobId stable : pas de second job en file. */
  async enqueueFirstPublication(jobId: string): Promise<void> {
    if (!this.queue) return;
    try {
      await this.queue.add(MATCH_JOB, { jobId }, { jobId: `match-${jobId}` });
    } catch (err) {
      this.logger.warn(`Alerte de correspondance non programmée pour ${jobId} : ${(err as Error).message}`);
    }
  }
}
