import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EXPIRE_JOB, SELECTION_QUEUE } from '@boulotflash/database';

/**
 * Producteur BullMQ : un job différé par proposition, à `expires_at`.
 * Si Redis manque, la proposition reste correcte : l’acceptation refuse déjà toute
 * proposition échue et le balayage (`POST /test/run-expirations`) rattrape le statut.
 */
@Injectable()
export class SelectionQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(SelectionQueueService.name);
  private readonly queue: Queue | null;

  constructor() {
    const url = process.env.REDIS_URL;
    this.queue = url
      ? new Queue(SELECTION_QUEUE, {
          connection: { url, maxRetriesPerRequest: null },
          defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 1000, attempts: 5, backoff: { type: 'exponential', delay: 5000 } },
        })
      : null;
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }

  /** `expiresAt` est calculé avec l’horloge applicative ; le délai se mesure sur l’horloge réelle du worker. */
  async scheduleExpiry(offerId: string, expiresAt: Date, appNow: Date): Promise<void> {
    if (!this.queue) return;
    const delay = Math.max(0, expiresAt.getTime() - appNow.getTime());
    try {
      await this.queue.add(
        EXPIRE_JOB,
        { offerId },
        // jobId stable : un rejeu de la proposition ne programme pas un second job.
        { delay, jobId: `expire-${offerId}` },
      );
    } catch (err) {
      this.logger.warn(`Expiration non programmée pour ${offerId} : ${(err as Error).message}`);
    }
  }
}
