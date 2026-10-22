import {
  createPrismaClient,
  generateTotpCode,
  TOTP_TEST_SECRET_DEFAULT,
} from '@boulotflash/database';
import * as argon2 from 'argon2';
import Redis from 'ioredis';

const hasDb =
  !!process.env.DATABASE_URL &&
  !!process.env.JWT_SECRET &&
  !!process.env.REDIS_URL;

const describeAdmin = hasDb ? describe : describe.skip;

const API_BASE =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';

const ADMIN_PASSWORD = 'BoulotFlash-Admin-Test-1';

function cookieHeaderFromSetCookie(setCookies: string[]): string {
  return setCookies
    .map((c) => c.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

async function request(
  path: string,
  opts: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<{
  status: number;
  json: Record<string, unknown>;
  setCookies: string[];
}> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: {
      accept: 'application/json',
      ...(opts.body !== undefined
        ? { 'content-type': 'application/json' }
        : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const setCookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : (() => {
          const single = res.headers.get('set-cookie');
          return single ? [single] : [];
        })();
  return { status: res.status, json, setCookies };
}

async function loginAdmin(
  username: string,
): Promise<{ accessToken: string; scope: string }> {
  const login = await request('/admin/auth/login', {
    body: { username, password: ADMIN_PASSWORD },
  });
  expect(login.status).toBe(200);
  expect(login.json.totpRequired).toBe(true);
  const cookie = cookieHeaderFromSetCookie(login.setCookies);
  const code = generateTotpCode(
    process.env.TOTP_TEST_SECRET?.trim() || TOTP_TEST_SECRET_DEFAULT,
  );
  const totp = await request('/admin/auth/totp', {
    body: { code },
    headers: { cookie },
  });
  expect(totp.status).toBe(200);
  expect(typeof totp.json.accessToken).toBe('string');
  return {
    accessToken: totp.json.accessToken as string,
    scope: totp.json.scope as string,
  };
}

describeAdmin('admin auth (étape 10)', () => {
  const db = createPrismaClient();

  afterAll(async () => {
    await db.$disconnect();
  });

  it('mot de passe admin jamais en clair en base', async () => {
    const superUser = await db.user.findFirst({
      where: { username: 'super' },
      select: { passwordHash: true },
    });
    expect(superUser?.passwordHash).toBeTruthy();
    expect(superUser!.passwordHash).not.toContain(ADMIN_PASSWORD);
    expect(await argon2.verify(superUser!.passwordHash!, ADMIN_PASSWORD)).toBe(
      true,
    );
  });

  it('login + TOTP super → session admin + ADMIN_LOGIN', async () => {
    const before = await db.auditLog.count({
      where: { action: 'ADMIN_LOGIN' },
    });
    const { accessToken, scope } = await loginAdmin('super');
    expect(scope).toBe('SUPER');
    const me = await request('/admin/me', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(me.status).toBe(200);
    expect(me.json.scope).toBe('SUPER');
    const after = await db.auditLog.count({
      where: { action: 'ADMIN_LOGIN' },
    });
    expect(after).toBeGreaterThan(before);
  });

  it('jeton public refuse /admin/me', async () => {
    if (
      !['1', 'true', 'yes', 'on'].includes(
        (process.env.ENABLE_TEST_HOOKS ?? '').trim().toLowerCase(),
      )
    ) {
      return;
    }
    const dev = await request('/auth/dev-session', {
      body: {
        ageConfirmed: true,
        acceptTerms: true,
        acceptPrivacy: true,
      },
    });
    if (dev.status !== 200 || !dev.json.accessToken) return;
    const me = await request('/admin/me', {
      headers: {
        authorization: `Bearer ${dev.json.accessToken as string}`,
      },
    });
    expect(me.status).toBe(401);
  });

  it('matrice scopes : support 403 sur close et create ; finance 200 payments ; modo suspend', async () => {
    const support = await loginAdmin('support');
    const finance = await loginAdmin('finance');
    const modo = await loginAdmin('modo');
    const superSess = await loginAdmin('super');

    const cComplet = await db.user.findFirst({
      where: { email: 'complet@demo.boulotflash.test' },
      select: { id: true },
    });
    expect(cComplet).toBeTruthy();

    const getUser = await request(`/admin/users/${cComplet!.id}`, {
      headers: { authorization: `Bearer ${support.accessToken}` },
    });
    expect(getUser.status).toBe(200);

    const close = await request(`/admin/users/${cComplet!.id}/close`, {
      method: 'POST',
      headers: { authorization: `Bearer ${support.accessToken}` },
    });
    expect(close.status).toBe(403);

    const create = await request('/admin/users', {
      method: 'POST',
      headers: { authorization: `Bearer ${support.accessToken}` },
      body: {
        username: 'nosupport',
        password: 'BoulotFlash-Admin-Test-9',
        adminScope: 'SUPPORT',
      },
    });
    expect(create.status).toBe(403);

    const payments = await request('/admin/payments', {
      headers: { authorization: `Bearer ${finance.accessToken}` },
    });
    expect(payments.status).toBe(200);
    expect(payments.json.items).toEqual([]);

    const paymentsDenied = await request('/admin/payments', {
      headers: { authorization: `Bearer ${support.accessToken}` },
    });
    expect(paymentsDenied.status).toBe(403);

    const job = await db.job.findFirst({
      where: { title: { startsWith: 'J-PUB-1' } },
      select: { id: true, status: true },
    });
    expect(job).toBeTruthy();

    // Remettre PUBLISHED si un run précédent a suspendu
    if (job!.status === 'SUSPENDED') {
      await db.job.update({
        where: { id: job!.id },
        data: { status: 'PUBLISHED' },
      });
    }

    const suspendDenied = await request(`/admin/jobs/${job!.id}/suspend`, {
      method: 'POST',
      headers: { authorization: `Bearer ${support.accessToken}` },
      body: { reason: 'test recette' },
    });
    expect(suspendDenied.status).toBe(403);

    const suspend = await request(`/admin/jobs/${job!.id}/suspend`, {
      method: 'POST',
      headers: { authorization: `Bearer ${modo.accessToken}` },
      body: { reason: 'test recette' },
    });
    expect(suspend.status).toBe(200);
    expect(suspend.json.status).toBe('SUSPENDED');

    // Restaurer pour ne pas casser les recettes suivantes
    await db.job.update({
      where: { id: job!.id },
      data: { status: 'PUBLISHED' },
    });

    const created = await request('/admin/users', {
      method: 'POST',
      headers: { authorization: `Bearer ${superSess.accessToken}` },
      body: {
        username: `t10_${Date.now().toString(36)}`,
        password: 'BoulotFlash-Admin-Test-9',
        adminScope: 'SUPPORT',
      },
    });
    expect(created.status).toBe(201);
    expect(created.json.totpSecret).toBeTruthy();
    expect(Array.isArray(created.json.recoveryCodes)).toBe(true);

    const row = await db.user.findFirst({
      where: { username: created.json.username as string },
      select: { passwordHash: true },
    });
    expect(row?.passwordHash).toBeTruthy();
    expect(row!.passwordHash).not.toContain('BoulotFlash-Admin-Test-9');
  });

  it('3× TOTP faux → lockout', async () => {
    const modo = await db.user.findFirst({
      where: { username: 'modo' },
      select: { id: true },
    });
    expect(modo).toBeTruthy();

    const redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 1,
    });
    try {
      await redis.del(
        `admin:totp_fail:${modo!.id}`,
        `admin:totp_lock:${modo!.id}`,
      );

      const login = await request('/admin/auth/login', {
        body: { username: 'modo', password: ADMIN_PASSWORD },
      });
      expect(login.status).toBe(200);
      const cookie = cookieHeaderFromSetCookie(login.setCookies);
      let lastStatus = 0;
      for (let i = 0; i < 3; i++) {
        const totp = await request('/admin/auth/totp', {
          body: { code: '000000' },
          headers: { cookie },
        });
        lastStatus = totp.status;
      }
      expect([401, 429]).toContain(lastStatus);

      const again = await request('/admin/auth/login', {
        body: { username: 'modo', password: ADMIN_PASSWORD },
      });
      if (again.status === 200) {
        const cookie2 = cookieHeaderFromSetCookie(again.setCookies);
        const totp = await request('/admin/auth/totp', {
          body: {
            code: generateTotpCode(
              process.env.TOTP_TEST_SECRET?.trim() || TOTP_TEST_SECRET_DEFAULT,
            ),
          },
          headers: { cookie: cookie2 },
        });
        expect(totp.status).toBe(429);
      } else {
        expect(again.status).toBe(429);
      }
    } finally {
      await redis.del(
        `admin:totp_fail:${modo!.id}`,
        `admin:totp_lock:${modo!.id}`,
      );
      redis.disconnect();
    }
  });
});
