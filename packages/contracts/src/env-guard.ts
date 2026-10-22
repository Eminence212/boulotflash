/**
 * Garde de démarrage API / worker (étape 04).
 * Ne journalise jamais la valeur d'un secret.
 */

const OAUTH_KEYS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'META_APP_ID',
  'META_APP_SECRET',
] as const;

const OAUTH_REDIRECT_KEYS = [
  'GOOGLE_REDIRECT_URI',
  'FACEBOOK_REDIRECT_URI',
  'INSTAGRAM_REDIRECT_URI',
] as const;

const PLACEHOLDER_RE =
  /^(replace-me|changeme|change-me|your-|todo|xxx|placeholder|example)/i;

export type EnvGuardResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function isPlaceholder(value: string | undefined): boolean {
  if (value === undefined || value.trim() === '') return true;
  return PLACEHOLDER_RE.test(value.trim());
}

function hasFcmOrFirebaseMessaging(env: NodeJS.ProcessEnv): string | null {
  for (const key of Object.keys(env)) {
    if (key.startsWith('FCM_')) return key;
    const upper = key.toUpperCase();
    if (
      upper.includes('FIREBASE') &&
      (upper.includes('MESSAGING') ||
        upper.includes('FCM') ||
        upper === 'FIREBASE_SERVER_KEY' ||
        upper === 'FIREBASE_MESSAGING_SENDER_ID')
    ) {
      return key;
    }
  }
  return null;
}

/**
 * Valide l'environnement sans quitter le processus.
 * Utilisé par les tests et par assertEnvOrExit.
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvGuardResult {
  for (const key of OAUTH_KEYS) {
    if (isPlaceholder(env[key])) {
      return {
        ok: false,
        code: 'OAUTH_SECRET_MISSING',
        message: `Secret OAuth manquant ou placeholder : ${key}. Configurez les quatre clés Google/Meta (D34). Aucun adaptateur simulé.`,
      };
    }
  }

  for (const key of OAUTH_REDIRECT_KEYS) {
    const value = env[key]?.trim() ?? '';
    if (!value || isPlaceholder(value) || !/^https?:\/\//i.test(value)) {
      return {
        ok: false,
        code: 'OAUTH_REDIRECT_MISSING',
        message: `URI de redirect OAuth manquante ou invalide : ${key}. Ex. http://localhost/auth/callback/google.`,
      };
    }
  }

  if (isPlaceholder(env.JWT_SECRET)) {
    return {
      ok: false,
      code: 'JWT_SECRET_MISSING',
      message:
        'JWT_SECRET manquant ou placeholder. Définissez un secret fort pour les jetons d’accès HS256 (étape 08).',
    };
  }

  const fcmKey = hasFcmOrFirebaseMessaging(env);
  if (fcmKey) {
    return {
      ok: false,
      code: 'FCM_FORBIDDEN',
      message: `Variable push interdite au pilote : ${fcmKey}. Notifications = in-app uniquement (D36).`,
    };
  }

  const totpAdapter = (env.TOTP_ADAPTER ?? '').trim().toLowerCase();
  if (totpAdapter && totpAdapter !== 'fixed' && totpAdapter !== 'live') {
    return {
      ok: false,
      code: 'TOTP_ADAPTER_INVALID',
      message: 'TOTP_ADAPTER doit être fixed ou live (ou absent).',
    };
  }

  const appEnv = (env.APP_ENV ?? 'development').trim().toLowerCase();
  if (appEnv === 'production') {
    if (isTruthy(env.ENABLE_TEST_HOOKS)) {
      return {
        ok: false,
        code: 'TEST_HOOKS_IN_PRODUCTION',
        message: 'ENABLE_TEST_HOOKS est interdit quand APP_ENV=production.',
      };
    }
    if (isTruthy(env.SEED_DEMO)) {
      return {
        ok: false,
        code: 'SEED_DEMO_IN_PRODUCTION',
        message: 'SEED_DEMO est interdit quand APP_ENV=production.',
      };
    }
    if (totpAdapter === 'fixed') {
      return {
        ok: false,
        code: 'TOTP_ADAPTER_FIXED_IN_PRODUCTION',
        message:
          'TOTP_ADAPTER=fixed est interdit quand APP_ENV=production (D18).',
      };
    }
    if (isPlaceholder(env.TOTP_ENCRYPTION_KEY)) {
      return {
        ok: false,
        code: 'TOTP_ENCRYPTION_KEY_MISSING',
        message:
          'TOTP_ENCRYPTION_KEY manquante ou placeholder (32 octets base64) en production.',
      };
    }
    const totpKey = Buffer.from(
      (env.TOTP_ENCRYPTION_KEY ?? '').trim(),
      'base64',
    );
    if (totpKey.length !== 32) {
      return {
        ok: false,
        code: 'TOTP_ENCRYPTION_KEY_INVALID',
        message:
          'TOTP_ENCRYPTION_KEY doit décoder en exactement 32 octets (AES-256).',
      };
    }
    const jwt = (env.JWT_SECRET ?? '').trim().toLowerCase();
    if (
      jwt.includes('dev-only') ||
      jwt.includes('example') ||
      jwt.length < 32
    ) {
      return {
        ok: false,
        code: 'JWT_SECRET_WEAK',
        message:
          'JWT_SECRET trop faible ou d’exemple : interdit quand APP_ENV=production.',
      };
    }
  }

  return { ok: true };
}

/**
 * Arrête le processus si la garde échoue. N'écrit jamais la valeur d'un secret.
 */
export function assertEnvOrExit(
  env: NodeJS.ProcessEnv = process.env,
  log: (msg: string) => void = console.error,
): void {
  const result = validateEnv(env);
  if (!result.ok) {
    log(`[env-guard] ${result.code}: ${result.message}`);
    process.exit(1);
  }
}
