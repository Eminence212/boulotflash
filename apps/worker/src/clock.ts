import Redis from 'ioredis';

const CLOCK_OFFSET_KEY = 'test:clock:offset-ms';

function testHooksEnabled(): boolean {
  const value = process.env.ENABLE_TEST_HOOKS?.trim().toLowerCase();
  return !!value && ['1', 'true', 'yes', 'on'].includes(value);
}

export type WorkerClock = { now: () => Promise<Date>; close: () => void };

/** Même horloge que l’API quand l’horloge de test est posée ; sinon l’heure réelle. */
export function createWorkerClock(redisUrl: string): WorkerClock {
  const redis = testHooksEnabled() ? new Redis(redisUrl, { maxRetriesPerRequest: 1 }) : null;
  return {
    async now() {
      if (!redis) return new Date();
      const raw = await redis.get(CLOCK_OFFSET_KEY).catch(() => null);
      const offset = raw === null ? 0 : Number(raw);
      return new Date(Date.now() + (Number.isFinite(offset) ? offset : 0));
    },
    close() {
      redis?.disconnect();
    },
  };
}
