import { randomUUID } from 'node:crypto';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  allowedTypes,
  extensionForContentType,
  FileKind,
  injectPublicPathPrefix,
  maxBytes,
  parsePublicEndpoint,
  presignTtlSeconds,
  requiredEnv,
  resolveBucketName,
} from './s3.config';

function validationError(message: string): never {
  throw new HttpException({ code: 'VALIDATION', message }, 400);
}

function parseKind(bucket: string): FileKind {
  if (bucket === 'media' || bucket === 'private') return bucket;
  validationError('bucket doit être "media" ou "private".');
}

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly ops: S3Client;
  private readonly signing: S3Client;
  private readonly publicPathPrefix: string;

  constructor(private readonly prisma: PrismaService) {
    const region = process.env.S3_REGION ?? 'us-east-1';
    const credentials = {
      accessKeyId: requiredEnv('S3_ACCESS_KEY'),
      secretAccessKey: requiredEnv('S3_SECRET_KEY'),
    };
    // Désactive les checksums flexibles AWS SDK v3 (souvent incompatibles MinIO + curl).
    const checksums = {
      requestChecksumCalculation: 'WHEN_REQUIRED' as const,
      responseChecksumValidation: 'WHEN_REQUIRED' as const,
    };
    this.ops = new S3Client({
      region,
      endpoint: requiredEnv('S3_ENDPOINT'),
      forcePathStyle: true,
      credentials,
      ...checksums,
    });
    const { origin, pathPrefix } = parsePublicEndpoint(
      requiredEnv('S3_PUBLIC_ENDPOINT'),
    );
    this.publicPathPrefix = pathPrefix;
    // Signature sur l’origine publique (jamais hostname interne `s3`).
    this.signing = new S3Client({
      region,
      endpoint: origin,
      forcePathStyle: true,
      credentials,
      ...checksums,
    });
  }

  async onModuleInit() {
    await this.ensureBuckets();
  }

  async ensureBuckets(): Promise<void> {
    for (const kind of ['media', 'private'] as const) {
      const name = resolveBucketName(kind);
      try {
        await this.ops.send(new HeadBucketCommand({ Bucket: name }));
      } catch {
        await this.ops.send(new CreateBucketCommand({ Bucket: name }));
      }
    }
  }

  private async signUrl(
    command: PutObjectCommand | GetObjectCommand,
    expiresIn: number,
  ): Promise<string> {
    const signed = await getSignedUrl(this.signing, command, { expiresIn });
    return injectPublicPathPrefix(signed, this.publicPathPrefix);
  }

  async createUploadPresign(input: {
    bucket: string;
    contentType: string;
  }): Promise<{ uploadUrl: string; key: string }> {
    const kind = parseKind(input.bucket);
    const contentType = (input.contentType ?? '').trim().toLowerCase();
    if (!allowedTypes(kind).has(contentType)) {
      validationError(
        `contentType refusé pour ${kind}: ${contentType || '(vide)'}`,
      );
    }

    const bucketName = resolveBucketName(kind);
    const key = `dev/${randomUUID()}.${extensionForContentType(contentType)}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await this.signUrl(command, presignTtlSeconds(kind));
    return { uploadUrl, key };
  }

  async completeUpload(input: {
    bucket: string;
    key: string;
  }): Promise<{ bucket: string; key: string; byteSize: number }> {
    const kind = parseKind(input.bucket);
    const key = (input.key ?? '').trim();
    if (!key || key.includes('..') || key.startsWith('/')) {
      validationError('key invalide.');
    }

    const bucketName = resolveBucketName(kind);
    let head;
    try {
      head = await this.ops.send(
        new HeadObjectCommand({ Bucket: bucketName, Key: key }),
      );
    } catch {
      validationError('Objet introuvable après upload.');
    }

    const byteSize = Number(head.ContentLength ?? 0);
    const contentType = (head.ContentType ?? '').toLowerCase();
    const limit = maxBytes(kind);

    if (byteSize <= 0 || byteSize > limit) {
      await this.ops.send(
        new DeleteObjectCommand({ Bucket: bucketName, Key: key }),
      );
      validationError(
        `Taille refusée (${byteSize} octets, max ${limit}). Objet supprimé.`,
      );
    }

    if (!allowedTypes(kind).has(contentType)) {
      await this.ops.send(
        new DeleteObjectCommand({ Bucket: bucketName, Key: key }),
      );
      validationError(
        `contentType objet refusé: ${contentType}. Objet supprimé.`,
      );
    }

    await this.prisma.client.storedObject.upsert({
      where: { bucket_key: { bucket: bucketName, key } },
      create: {
        kind: kind === 'media' ? 'MEDIA' : 'PRIVATE',
        bucket: bucketName,
        key,
        contentType,
        byteSize,
      },
      update: { contentType, byteSize },
    });

    return { bucket: bucketName, key, byteSize };
  }

  async createDownloadUrl(input: {
    bucket: string;
    key: string;
    /** Override TTL pour tests (secondes). */
    expiresIn?: number;
  }): Promise<{ downloadUrl: string }> {
    const kind = parseKind(input.bucket);
    const key = (input.key ?? '').trim();
    if (!key) {
      validationError('key invalide.');
    }
    const bucketName = resolveBucketName(kind);
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const downloadUrl = await this.signUrl(
      command,
      input.expiresIn ?? presignTtlSeconds(kind),
    );
    return { downloadUrl };
  }

  /** Exposé aux tests d’intégration — client ops interne. */
  getOpsClient(): S3Client {
    return this.ops;
  }
}
