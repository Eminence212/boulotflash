import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const FAIL_KEY = (userId: string) => `admin:totp_fail:${userId}`;
const LOCK_KEY = (userId: string) => `admin:totp_lock:${userId}`;
const MAX_FAILS = 3;
const LOCK_SEC = 15 * 60;
const FAIL_WINDOW_SEC = 15 * 60;

@Injectable()
export class AdminLockoutService implements OnModuleDestroy {
  private readonly redis: Redis | null;
  /** Fallback mémoire si Redis absent (dev / tests unitaires). */
  private readonly memory = new Map<
    string,
    { fails: number; lockedUntil: number }
  >();

  constructor() {
    const url = process.env.REDIS_URL;
    this.redis = url
      ? new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true })
      : null;
  }

  async onModuleDestroy() {
    this.redis?.disconnect();
  }

  private async ready(): Promise<Redis | null> {
    if (!this.redis) return null;
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect().catch(() => undefined);
      }
      return this.redis.status === 'ready' ? this.redis : null;
    } catch {
      return null;
    }
  }

  async isLocked(userId: string): Promise<boolean> {
    const redis = await this.ready();
    if (redis) {
      const ttl = await redis.ttl(LOCK_KEY(userId));
      return ttl > 0;
    }
    const entry = this.memory.get(userId);
    if (!entry) return false;
    if (entry.lockedUntil > Date.now()) return true;
    return false;
  }

  async recordFailure(userId: string): Promise<{ locked: boolean }> {
    const redis = await this.ready();
    if (redis) {
      const n = await redis.incr(FAIL_KEY(userId));
      if (n === 1) await redis.expire(FAIL_KEY(userId), FAIL_WINDOW_SEC);
      if (n >= MAX_FAILS) {
        await redis.set(LOCK_KEY(userId), '1', 'EX', LOCK_SEC);
        await redis.del(FAIL_KEY(userId));
        return { locked: true };
      }
      return { locked: false };
    }

    const entry = this.memory.get(userId) ?? { fails: 0, lockedUntil: 0 };
    entry.fails += 1;
    if (entry.fails >= MAX_FAILS) {
      entry.lockedUntil = Date.now() + LOCK_SEC * 1000;
      entry.fails = 0;
      this.memory.set(userId, entry);
      return { locked: true };
    }
    this.memory.set(userId, entry);
    return { locked: false };
  }

  async clearFailures(userId: string): Promise<void> {
    const redis = await this.ready();
    if (redis) {
      await redis.del(FAIL_KEY(userId), LOCK_KEY(userId));
      return;
    }
    this.memory.delete(userId);
  }
}
