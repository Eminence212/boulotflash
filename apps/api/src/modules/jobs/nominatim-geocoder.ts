import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import {
  memoryCache,
  NOMINATIM_CACHE_TTL_SEC,
  nominatimAdapter,
  resolveJobCoords,
  type CacheStore,
  type GeoPoint,
} from './nominatim-search';

/**
 * Géocode le repère public et, à part, l’adresse exacte.
 * Sans NOMINATIM_USER_AGENT : aucun appel, aucune écriture.
 * Les colonnes privées ne sont jamais renvoyées par le DTO public.
 */
@Injectable()
export class NominatimGeocoder implements OnModuleDestroy {
  private readonly logger = new Logger(NominatimGeocoder.name);
  private redis: Redis | null | undefined;
  private readonly local = memoryCache();
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  /** File interne : une offre à la fois, après la transaction de publication. */
  enqueue(jobId: string): Promise<void> {
    const run = this.tail.then(() => this.applyToJob(jobId));
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async applyToJob(jobId: string): Promise<void> {
    const userAgent = process.env.NOMINATIM_USER_AGENT?.trim() ?? '';
    if (!userAgent) {
      this.logger.log('Géocodage ignoré : identifiant de contact absent.');
      return;
    }

    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: {
        publicLandmark: true,
        addressPrivate: true,
        commune: {
          select: { name: true, city: { select: { name: true } } },
        },
      },
    });
    if (!job) return;

    if (nominatimAdapter() !== 'live') {
      this.logger.log('Géocodage local par fixture, sans requête réseau.');
    }

    const data = await resolveJobCoords({
      userAgent,
      landmark: job.publicLandmark,
      address: job.addressPrivate,
      place: [
        job.commune.name,
        job.commune.city.name,
        'République démocratique du Congo',
      ].join(', '),
      cache: this.cacheStore(),
      onRequest: (status) => {
        this.logger.log(`Requête Nominatim HTTP ${status}`);
      },
    });
    if (!data) return;
    await this.prisma.client.job.update({ where: { id: jobId }, data });
  }

  private cacheStore(): CacheStore {
    return {
      get: (key) => this.readCache(key),
      set: (key, point) => this.writeCache(key, point),
    };
  }

  private async readCache(key: string): Promise<GeoPoint | null | undefined> {
    const local = await this.local.get(key);
    if (local !== undefined) return local;

    const redis = this.client();
    if (!redis) return undefined;
    try {
      if (redis.status !== 'ready') {
        await redis.connect().catch(() => undefined);
      }
      if (redis.status !== 'ready') return undefined;
      const raw = await redis.get(key);
      if (raw == null) return undefined;
      const point = raw === 'null' ? null : (JSON.parse(raw) as GeoPoint);
      await this.local.set(key, point);
      return point;
    } catch {
      return undefined;
    }
  }

  private async writeCache(key: string, point: GeoPoint | null): Promise<void> {
    await this.local.set(key, point);
    const redis = this.client();
    if (!redis) return;
    try {
      if (redis.status !== 'ready') {
        await redis.connect().catch(() => undefined);
      }
      if (redis.status !== 'ready') return;
      await redis.set(
        key,
        point ? JSON.stringify(point) : 'null',
        'EX',
        NOMINATIM_CACHE_TTL_SEC,
      );
    } catch {
      /* le cache mémoire suffit pour cette requête */
    }
  }

  private client(): Redis | null {
    if (this.redis !== undefined) return this.redis;
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.redis = null;
      return null;
    }
    this.redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    return this.redis;
  }
}
