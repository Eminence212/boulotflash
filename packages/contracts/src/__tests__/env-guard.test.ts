import { validateEnv } from '../env-guard';

function baseEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    APP_ENV: 'development',
    GOOGLE_CLIENT_ID: 'local-dev-google-id',
    GOOGLE_CLIENT_SECRET: 'local-dev-google-secret',
    META_APP_ID: 'local-dev-meta-id',
    META_APP_SECRET: 'local-dev-meta-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost/auth/callback/google',
    FACEBOOK_REDIRECT_URI: 'http://localhost/auth/callback/facebook',
    GITHUB_CLIENT_ID: 'local-dev-github-id',
    GITHUB_CLIENT_SECRET: 'local-dev-github-secret',
    GITHUB_REDIRECT_URI: 'http://localhost/auth/callback/github',
    JWT_SECRET: 'local-dev-jwt-secret-at-least-32-chars',
    ENABLE_TEST_HOOKS: 'true',
    SEED_DEMO: 'false',
    ...overrides,
  };
}

describe('validateEnv', () => {
  it('accepte un environnement de développement valide', () => {
    expect(validateEnv(baseEnv())).toEqual({ ok: true });
  });

  it('refuse un secret OAuth manquant', () => {
    const result = validateEnv(baseEnv({ GOOGLE_CLIENT_SECRET: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('OAUTH_SECRET_MISSING');
      expect(result.message).toContain('GOOGLE_CLIENT_SECRET');
      expect(result.message).not.toMatch(/local-dev/);
    }
  });

  it('refuse un placeholder OAuth', () => {
    const result = validateEnv(
      baseEnv({ META_APP_SECRET: 'replace-me-meta-app-secret' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('OAUTH_SECRET_MISSING');
  });

  it('refuse toute variable FCM_*', () => {
    const result = validateEnv(baseEnv({ FCM_ADAPTER: 'noop' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('FCM_FORBIDDEN');
      expect(result.message).toContain('FCM_ADAPTER');
    }
  });

  it('refuse SEED_DEMO en production', () => {
    const result = validateEnv(
      baseEnv({ APP_ENV: 'production', SEED_DEMO: 'true', ENABLE_TEST_HOOKS: 'false' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('SEED_DEMO_IN_PRODUCTION');
  });

  it('refuse ENABLE_TEST_HOOKS en production', () => {
    const result = validateEnv(
      baseEnv({ APP_ENV: 'production', ENABLE_TEST_HOOKS: 'true', SEED_DEMO: 'false' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('TEST_HOOKS_IN_PRODUCTION');
  });

  it('refuse JWT_SECRET manquant', () => {
    const result = validateEnv(baseEnv({ JWT_SECRET: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('JWT_SECRET_MISSING');
  });

  it('refuse une URI de redirect OAuth manquante', () => {
    const result = validateEnv(baseEnv({ GOOGLE_REDIRECT_URI: undefined }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('OAUTH_REDIRECT_MISSING');
      expect(result.message).toContain('GOOGLE_REDIRECT_URI');
    }
  });

  it('refuse JWT_SECRET d’exemple en production', () => {
    const result = validateEnv(
      baseEnv({
        APP_ENV: 'production',
        ENABLE_TEST_HOOKS: 'false',
        SEED_DEMO: 'false',
        TOTP_ADAPTER: 'live',
        TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString('base64'),
        JWT_SECRET: 'boulotflash-jwt-dev-only-not-for-prod',
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('JWT_SECRET_WEAK');
  });

  it('refuse TOTP_ADAPTER=fixed en production', () => {
    const result = validateEnv(
      baseEnv({
        APP_ENV: 'production',
        ENABLE_TEST_HOOKS: 'false',
        SEED_DEMO: 'false',
        TOTP_ADAPTER: 'fixed',
        TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
        JWT_SECRET: 'production-grade-jwt-secret-at-least-32-chars',
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('TOTP_ADAPTER_FIXED_IN_PRODUCTION');
  });

  it('refuse TOTP_ENCRYPTION_KEY placeholder en production', () => {
    const result = validateEnv(
      baseEnv({
        APP_ENV: 'production',
        ENABLE_TEST_HOOKS: 'false',
        SEED_DEMO: 'false',
        TOTP_ADAPTER: 'live',
        TOTP_ENCRYPTION_KEY: 'replace-me-totp-key',
        JWT_SECRET: 'production-grade-jwt-secret-at-least-32-chars',
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('TOTP_ENCRYPTION_KEY_MISSING');
  });
});
