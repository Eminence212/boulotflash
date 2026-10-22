import { Injectable } from '@nestjs/common';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { pingPostgres } from '@boulotflash/database';
import Redis from 'ioredis';

export type HealthPayload = {
  status: 'ok' | 'degraded';
  postgres: 'ok' | 'error';
  redis: 'ok' | 'error';
  s3: 'ok' | 'error';
};

@Injectable()
export class HealthService {
  async check(): Promise<HealthPayload> {
    const [postgres, redis, s3] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkS3(),
    ]);

    const allOk = postgres === 'ok' && redis === 'ok' && s3 === 'ok';
    return {
      status: allOk ? 'ok' : 'degraded',
      postgres,
      redis,
      s3,
    };
  }

  private async checkPostgres(): Promise<'ok' | 'error'> {
    const url = process.env.DATABASE_URL;
    if (!url) return 'error';
    return (await pingPostgres(url)) ? 'ok' : 'error';
  }

  private async checkRedis(): Promise<'ok' | 'error'> {
    const url = process.env.REDIS_URL;
    if (!url) return 'error';
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    try {
      await client.connect();
      const pong = await client.ping();
      return pong === 'PONG' ? 'ok' : 'error';
    } catch {
      return 'error';
    } finally {
      client.disconnect();
    }
  }

  private async checkS3(): Promise<'ok' | 'error'> {
    const endpoint = process.env.S3_ENDPOINT;
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;
    const bucket = process.env.S3_BUCKET_MEDIA;
    if (!endpoint || !accessKey || !secretKey || !bucket) return 'error';

    const client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });

    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return 'ok';
    } catch {
      return 'error';
    } finally {
      client.destroy();
    }
  }
}
