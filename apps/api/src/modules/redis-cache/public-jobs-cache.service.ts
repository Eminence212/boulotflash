import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { createHash } from 'node:crypto';

const GEN_KEY = 'jobs:public:gen';
const TTL_SEC = 60;

/**
 * Cache liste publique — payload = DTO public uniquement.
 * Invalidation par incrément de génération (publication, suspension, expiration, pourvoi).
 */
@Injectable()
export class PublicJobsCacheService implements OnModuleDestroy {
  private readonly redis: Redis | null;

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
    if (this.redis.status !== 'ready') {
      await this.redis.connect().catch(() => undefined);
    }
    return this.redis.status === 'ready' ? this.redis : null;
  }

  cacheKey(query: Record<string, string | number | undefined | null>): string {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      normalized[k] = String(v);
    }
    const stable = Object.keys(normalized)
      .sort()
      .map((k) => `${k}=${normalized[k]}`)
      .join('&');
    const hash = createHash('sha256').update(stable).digest('hex').slice(0, 24);
    return hash;
  }

  async get<T>(queryHash: string): Promise<T | null> {
    const r = await this.ready();
    if (!r) return null;
    const gen = (await r.get(GEN_KEY)) ?? '0';
    const raw = await r.get(`jobs:public:${gen}:${queryHash}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(queryHash: string, payload: unknown): Promise<void> {
    const r = await this.ready();
    if (!r) return;
    const gen = (await r.get(GEN_KEY)) ?? '0';
    await r.setex(
      `jobs:public:${gen}:${queryHash}`,
      TTL_SEC,
      JSON.stringify(payload),
    );
  }

  /** Invalide tout le cache liste (nouvelle génération). */
  async invalidate(): Promise<void> {
    const r = await this.ready();
    if (!r) return;
    await r.incr(GEN_KEY);
  }
}
