import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class TokenBlacklistService implements OnModuleDestroy {
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

  async revokeAccess(jti: string, ttlSec: number): Promise<void> {
    const r = await this.ready();
    if (!r) return;
    await r.setex(`bl:access:${jti}`, Math.max(1, ttlSec), '1');
  }

  async isRevoked(jti: string): Promise<boolean> {
    const r = await this.ready();
    if (!r) return false;
    const v = await r.get(`bl:access:${jti}`);
    return v === '1';
  }
}
