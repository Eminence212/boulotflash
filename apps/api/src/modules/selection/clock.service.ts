import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const OFFSET_KEY = 'test:clock:offset-ms';

export function testHooksEnabled(): boolean {
  const value = process.env.ENABLE_TEST_HOOKS;
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/**
 * Horloge applicative. Hors hooks de test : l’heure réelle.
 * Avec ENABLE_TEST_HOOKS, `POST /test/clock` pose un décalage dans Redis, partagé par
 * toutes les instances : le temps continue de s’écouler à partir de l’heure posée.
 */
@Injectable()
export class ClockService implements OnModuleDestroy {
  private readonly redis: Redis | null;

  constructor() {
    const url = process.env.REDIS_URL;
    this.redis =
      url && testHooksEnabled()
        ? new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true })
        : null;
  }

  async onModuleDestroy() {
    this.redis?.disconnect();
  }

  async now(): Promise<Date> {
    const offset = await this.offsetMs();
    return new Date(Date.now() + offset);
  }

  /** Pose l’heure applicative (`null` revient à l’heure réelle). */
  async set(at: Date | null): Promise<Date> {
    const redis = await this.ready();
    if (!redis) throw new Error('Horloge de test indisponible : Redis ou hooks absents.');
    if (at === null) {
      await redis.del(OFFSET_KEY);
    } else {
      await redis.set(OFFSET_KEY, String(at.getTime() - Date.now()));
    }
    return this.now();
  }

  private async offsetMs(): Promise<number> {
    const redis = await this.ready();
    if (!redis) return 0;
    const raw = await redis.get(OFFSET_KEY).catch(() => null);
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  private async ready(): Promise<Redis | null> {
    if (!this.redis) return null;
    if (this.redis.status === 'wait' || this.redis.status === 'end') {
      await this.redis.connect().catch(() => undefined);
    }
    return this.redis.status === 'ready' ? this.redis : null;
  }
}
