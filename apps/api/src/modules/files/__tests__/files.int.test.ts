import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPrismaClient } from '@boulotflash/database';

const hasS3 =
  !!process.env.S3_ENDPOINT &&
  !!process.env.S3_ACCESS_KEY &&
  !!process.env.S3_BUCKET_MEDIA &&
  !!process.env.DATABASE_URL;

const describeS3 = hasS3 ? describe : describe.skip;

const API_BASE =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';

/** PNG 1×1 minimal */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function opsClient(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    endpoint: process.env.S3_ENDPOINT!,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
}

async function postJson<T>(
  path: string,
  body: unknown,
): Promise<{ status: number; json: T }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T;
  return { status: res.status, json };
}

describeS3('files S3 (étape 07)', () => {
  const db = createPrismaClient();
  const s3 = opsClient();

  afterAll(async () => {
    await db.$disconnect();
    s3.destroy();
  });

  it('refuse text/plain sans créer d’objet', async () => {
    const { status, json } = await postJson<{ code?: string }>('/files/dev-presign', {
      bucket: 'media',
      contentType: 'text/plain',
    });
    expect(status).toBe(400);
    expect(json.code).toBe('VALIDATION');
  });

  it('PUT PNG + complete → stored_objects (clé, pas d’URL)', async () => {
    const { status, json } = await postJson<{ uploadUrl: string; key: string }>(
      '/files/dev-presign',
      { bucket: 'media', contentType: 'image/png' },
    );
    expect([200, 201]).toContain(status);
    expect(json.uploadUrl).toContain('X-Amz-Signature');
    expect(json.uploadUrl).not.toContain('://s3:');
    expect(json.key.startsWith('dev/')).toBe(true);

    // Depuis le réseau Compose, l’URL publique (localhost) n’est pas joignable :
    // on PUT via le client ops interne (même objet).
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_MEDIA!,
        Key: json.key,
        Body: TINY_PNG,
        ContentType: 'image/png',
      }),
    );

    const done = await postJson<{ bucket: string; key: string; byteSize: number }>(
      '/files/dev-complete',
      { bucket: 'media', key: json.key },
    );
    expect([200, 201]).toContain(done.status);
    expect(done.json.byteSize).toBe(TINY_PNG.length);
    expect(done.json.key).toBe(json.key);

    const row = await db.storedObject.findUnique({
      where: {
        bucket_key: { bucket: process.env.S3_BUCKET_MEDIA!, key: json.key },
      },
    });
    expect(row).toBeTruthy();
    expect(row!.key).toBe(json.key);
    expect(JSON.stringify(row)).not.toMatch(/X-Amz-Signature/);
    expect(JSON.stringify(row)).not.toContain(json.uploadUrl);
  });

  it('URL GET TTL 1s : signature courte X-Amz-Expires=1', async () => {
    const { json: signed } = await postJson<{ uploadUrl: string; key: string }>(
      '/files/dev-presign',
      { bucket: 'private', contentType: 'image/png' },
    );
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_PRIVATE!,
        Key: signed.key,
        Body: TINY_PNG,
        ContentType: 'image/png',
      }),
    );
    await postJson('/files/dev-complete', {
      bucket: 'private',
      key: signed.key,
    });

    const { status, json } = await postJson<{ downloadUrl: string }>(
      '/files/dev-download-url',
      { bucket: 'private', key: signed.key, expiresIn: 1 },
    );
    expect([200, 201]).toContain(status);
    expect(json.downloadUrl).toMatch(/X-Amz-Expires=1/);
    expect(json.downloadUrl).toContain('X-Amz-Signature');
    expect(json.downloadUrl).not.toContain('://s3:');

    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET_PRIVATE!,
        Key: signed.key,
      }),
    );
    expect(head.ContentLength).toBe(TINY_PNG.length);
  });

  it('complete 6 Mo media → refuse et supprime l’objet', async () => {
    const { json: signed } = await postJson<{ key: string }>('/files/dev-presign', {
      bucket: 'media',
      contentType: 'image/png',
    });
    const big = Buffer.alloc(6 * 1024 * 1024, 1);
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_MEDIA!,
        Key: signed.key,
        Body: big,
        ContentType: 'image/png',
      }),
    );

    const { status, json } = await postJson<{ code?: string }>('/files/dev-complete', {
      bucket: 'media',
      key: signed.key,
    });
    expect(status).toBe(400);
    expect(json.code).toBe('VALIDATION');

    await expect(
      s3.send(
        new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET_MEDIA!,
          Key: signed.key,
        }),
      ),
    ).rejects.toBeTruthy();

    await s3
      .send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_MEDIA!,
          Key: signed.key,
        }),
      )
      .catch(() => undefined);
  });
});
