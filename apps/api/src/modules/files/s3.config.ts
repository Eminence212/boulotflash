export type FileKind = 'media' | 'private';

export const MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const PRIVATE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const PRIVATE_MAX_BYTES = 10 * 1024 * 1024;

export function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`${name} is required`);
  }
  return v.trim();
}

export function resolveBucketName(kind: FileKind): string {
  if (kind === 'media') return requiredEnv('S3_BUCKET_MEDIA');
  return requiredEnv('S3_BUCKET_PRIVATE');
}

export function allowedTypes(kind: FileKind): Set<string> {
  return kind === 'media' ? MEDIA_TYPES : PRIVATE_TYPES;
}

export function maxBytes(kind: FileKind): number {
  return kind === 'media' ? MEDIA_MAX_BYTES : PRIVATE_MAX_BYTES;
}

export function presignTtlSeconds(kind: FileKind): number {
  if (kind === 'media') {
    return Number(process.env.PRESIGN_MEDIA_TTL ?? 900);
  }
  return Number(process.env.PRESIGN_PRIVATE_TTL ?? 300);
}

export function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}

/**
 * S3 API ne peut pas être signé sous un path prefix (/s3) : la signature
 * inclut le path tel que MinIO le voit après strip Caddy.
 * On signe donc sur l’origine seule, puis on réinjecte le préfixe dans l’URL.
 */
export function parsePublicEndpoint(raw: string): {
  origin: string;
  pathPrefix: string;
} {
  const u = new URL(raw);
  const pathPrefix = u.pathname.replace(/\/+$/, '');
  return { origin: u.origin, pathPrefix };
}

export function injectPublicPathPrefix(
  signedUrl: string,
  pathPrefix: string,
): string {
  if (!pathPrefix) return signedUrl;
  const u = new URL(signedUrl);
  u.pathname = `${pathPrefix}${u.pathname}`;
  return u.toString();
}
