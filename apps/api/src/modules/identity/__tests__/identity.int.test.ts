import { createHash } from 'node:crypto';
import { createPrismaClient } from '@boulotflash/database';

const hasDb =
  !!process.env.DATABASE_URL &&
  !!process.env.JWT_SECRET &&
  !!process.env.REDIS_URL;

const describeAuth = hasDb ? describe : describe.skip;

const API_BASE =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';

function hashRefresh(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

function cookieFromSetCookie(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(',')[0] ?? header;
  const part = first.split(';')[0]?.trim();
  return part || null;
}

async function post(
  path: string,
  opts: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<{ status: number; json: Record<string, unknown>; setCookie: string | null }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(opts.headers ?? {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const setCookie =
    res.headers.getSetCookie?.()?.[0] ??
    res.headers.get('set-cookie');
  return { status: res.status, json, setCookie };
}

async function getMe(accessToken: string): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

describeAuth('identity sessions (étape 08)', () => {
  const db = createPrismaClient();

  afterAll(async () => {
    await db.$disconnect();
  });

  it('refuse idToken demo: sans créer d’user', async () => {
    const before = await db.user.count();
    const { status, json } = await post('/auth/oauth/google', {
      body: { idToken: 'demo:google:fake' },
    });
    expect(status).toBe(401);
    expect(json.code).toBe('UNAUTHORIZED');
    const after = await db.user.count();
    expect(after).toBe(before);
  });

  it('dev-session → /me 200 ; refresh rotation ; logout révoque', async () => {
    if (!['1', 'true', 'yes', 'on'].includes(
      (process.env.ENABLE_TEST_HOOKS ?? '').trim().toLowerCase(),
    )) {
      return;
    }

    const session = await post('/auth/dev-session', {
      body: { email: `jest-${Date.now()}@boulotflash.local` },
    });
    expect([200, 201]).toContain(session.status);
    const accessToken = session.json.accessToken as string;
    expect(accessToken).toBeTruthy();
    expect(JSON.stringify(session.json)).not.toMatch(/bf_refresh=/);

    const cookiePair = cookieFromSetCookie(session.setCookie);
    expect(cookiePair?.startsWith('bf_refresh=')).toBe(true);
    const rawRefresh = decodeURIComponent(cookiePair!.slice('bf_refresh='.length));

    const me = await getMe(accessToken);
    expect(me.status).toBe(200);
    expect(me.json.id).toBe(session.json.userId);

    const refreshed = await post('/auth/refresh', {
      headers: { cookie: cookiePair! },
    });
    expect([200, 201]).toContain(refreshed.status);
    expect(refreshed.json.accessToken).toBeTruthy();
    expect(refreshed.json.accessToken).not.toBe(accessToken);

    const oldRow = await db.refreshToken.findFirst({
      where: { tokenHash: hashRefresh(rawRefresh) },
    });
    expect(oldRow?.revokedAt).toBeTruthy();
    expect(oldRow?.replacedBy).toBeTruthy();

    const newCookie = cookieFromSetCookie(refreshed.setCookie);
    expect(newCookie?.startsWith('bf_refresh=')).toBe(true);

    const accessAfterRefresh = refreshed.json.accessToken as string;
    const logout = await post('/auth/logout', {
      headers: {
        cookie: newCookie!,
        authorization: `Bearer ${accessAfterRefresh}`,
      },
    });
    expect([200, 201]).toContain(logout.status);

    const newRaw = decodeURIComponent(newCookie!.slice('bf_refresh='.length));
    const revoked = await db.refreshToken.findFirst({
      where: { tokenHash: hashRefresh(newRaw) },
    });
    expect(revoked?.revokedAt).toBeTruthy();

    const meAfter = await getMe(accessAfterRefresh);
    expect(meAfter.status).toBe(401);

    const deadRefresh = await post('/auth/refresh', {
      headers: { cookie: newCookie! },
    });
    expect(deadRefresh.status).toBe(401);
  });
});
