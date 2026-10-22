/**
 * TOTP RFC 6238 + chiffrement AES-256-GCM du secret (D18 / étape 10).
 * Pure Node crypto — pas d’otplib.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SEED_FIXED_PREFIX = 'seed-fixed:';
const ENC_PREFIX = 'v1:';

export const TOTP_TEST_SECRET_DEFAULT = 'JBSWY3DPEHPK3PXP';

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function isTotpAdapterFixed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (env.TOTP_ADAPTER ?? '').trim().toLowerCase() === 'fixed';
}

/** Clé 32 octets depuis TOTP_ENCRYPTION_KEY (base64). */
export function loadTotpEncryptionKey(
  env: NodeJS.ProcessEnv = process.env,
): Buffer | null {
  const raw = env.TOTP_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  try {
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) return null;
    return key;
  } catch {
    return null;
  }
}

export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(secret: string): Buffer {
  const cleaned = secret.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error('invalid base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(key: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  const str = String(code % 10 ** digits);
  return str.padStart(digits, '0');
}

export function generateTotpCode(
  secretBase32: string,
  atMs: number = Date.now(),
  stepSec = 30,
): string {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(atMs / 1000 / stepSec);
  return hotp(key, counter);
}

export function verifyTotpCode(
  secretBase32: string,
  code: string,
  opts: { atMs?: number; window?: number; stepSec?: number } = {},
): boolean {
  const cleaned = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned)) return false;
  const atMs = opts.atMs ?? Date.now();
  const window = opts.window ?? 1;
  const stepSec = opts.stepSec ?? 30;
  const key = base32Decode(secretBase32);
  const counter = Math.floor(atMs / 1000 / stepSec);
  const expected = Buffer.from(cleaned);
  for (let w = -window; w <= window; w++) {
    const candidate = Buffer.from(hotp(key, counter + w));
    if (
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    ) {
      return true;
    }
  }
  return false;
}

/** Chiffre un secret Base32. Format `v1:` + base64(iv|tag|ciphertext). */
export function encryptTotpSecret(secretBase32: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(secretBase32, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/**
 * Déchiffre un secret stocké.
 * - `v1:…` AES-GCM
 * - `seed-fixed:SECRET` (base64) si TOTP_ADAPTER=fixed
 */
export function decryptTotpSecret(
  secretEncrypted: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (secretEncrypted.startsWith(ENC_PREFIX)) {
    const key = loadTotpEncryptionKey(env);
    if (!key) {
      throw new Error('TOTP_ENCRYPTION_KEY manquante pour déchiffrer le secret');
    }
    const raw = Buffer.from(secretEncrypted.slice(ENC_PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  const decoded = Buffer.from(secretEncrypted, 'base64').toString('utf8');
  if (decoded.startsWith(SEED_FIXED_PREFIX) && isTotpAdapterFixed(env)) {
    return decoded.slice(SEED_FIXED_PREFIX.length);
  }

  if (isTotpAdapterFixed(env)) {
    return env.TOTP_TEST_SECRET?.trim() || TOTP_TEST_SECRET_DEFAULT;
  }

  throw new Error('Format de secret TOTP inconnu ou adaptateur fixed requis');
}

/** Encodage seed : vrai chiffrement si clé, sinon seed-fixed sous TOTP_ADAPTER=fixed. */
export function encodeTotpSecretForStorage(
  secretBase32: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const key = loadTotpEncryptionKey(env);
  if (key) {
    return encryptTotpSecret(secretBase32, key);
  }
  if (isTotpAdapterFixed(env)) {
    return Buffer.from(`${SEED_FIXED_PREFIX}${secretBase32}`, 'utf8').toString(
      'base64',
    );
  }
  throw new Error(
    'TOTP_ENCRYPTION_KEY requis (ou TOTP_ADAPTER=fixed hors production)',
  );
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(`BF-${randomBytes(4).toString('hex').toUpperCase()}`);
  }
  return codes;
}

export { isTruthy as isEnvTruthy };
