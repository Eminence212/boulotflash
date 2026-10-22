import { HttpException, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const WINDOW_SEC = 60;
const MAX_HITS = 30;

@Injectable()
export class OauthRateLimitService implements OnModuleDestroy {
  private readonly redis: Redis | null;

  constructor() {
    const url = process.env.REDIS_URL;
    this.redis = url
      ? new Redis(url, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        })
      : null;
  }

  async onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  async assertAllowed(ip: string): Promise<void> {
    if (!this.redis) return;
    const key = `rl:oauth:${ip || 'unknown'}`;
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect().catch(() => undefined);
      }
      const n = await this.redis.incr(key);
      if (n === 1) await this.redis.expire(key, WINDOW_SEC);
      if (n > MAX_HITS) {
        throw new HttpException(
          { code: 'RATE_LIMITED', message: 'Trop de tentatives OAuth.' },
          429,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Redis down : ne bloque pas l’auth en local (health marque déjà degraded).
    }
  }
}
