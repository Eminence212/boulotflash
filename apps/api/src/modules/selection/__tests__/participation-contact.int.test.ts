/**
 * Étape 17 — révélation et révocation des coordonnées.
 * API réelle + Postgres réel (ENABLE_TEST_HOOKS, SEED_DEMO, comptes admin semés). `jest --runInBand`.
 */
import { randomUUID } from 'node:crypto';
import {
  createPrismaClient,
  generateTotpCode,
  TOTP_TEST_SECRET_DEFAULT,
} from '@boulotflash/database';

const hasDb = !!process.env.DATABASE_URL && !!process.env.JWT_SECRET && !!process.env.REDIS_URL;
const describeContact = hasDb ? describe : describe.skip;

const API_BASE = process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';
const ADMIN_PASSWORD = 'BoulotFlash-Admin-Test-1';
const DAY = 24 * 60 * 60 * 1000;
const ADDRESS = '17 avenue secrète, Gombe';

type Res = { status: number; json: Record<string, unknown>; raw: string; headers: Headers; cookies: string[] };

async function api(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; key?: string; cookie?: string } = {},
): Promise<Res> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.key ? { 'idempotency-key': opts.key } : {}),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const raw = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return { status: res.status, json, raw, headers: res.headers, cookies: res.headers.getSetCookie() };
}

let seq = 0;
async function session(prefix: string): Promise<{ token: string; userId: string; phone: string }> {
  const created = await api('POST', '/auth/dev-session', {
    body: { email: `etape17-${randomUUID()}@boulotflash.local`, ageConfirmed: true, acceptTerms: true, acceptPrivacy: true },
  });
  const token = created.json.accessToken as string;
  seq += 1;
  const phone = `+243${prefix}${String(Date.now() + seq).slice(-7)}`;
  await api('PATCH', '/me', { token, body: { displayName: `Étape17 ${prefix}`, phone } });
  const me = await api('GET', '/me', { token });
  return { token, userId: me.json.id as string, phone };
}

async function adminToken(username: string): Promise<string> {
  const login = await api('POST', '/admin/auth/login', { body: { username, password: ADMIN_PASSWORD } });
  expect(login.status).toBe(200);
  const cookie = login.cookies.map((c) => c.split(';')[0]).join('; ');
  const code = generateTotpCode(process.env.TOTP_TEST_SECRET?.trim() || TOTP_TEST_SECRET_DEFAULT);
  const totp = await api('POST', '/admin/auth/totp', { body: { code }, cookie });
  expect(totp.status).toBe(200);
  return totp.json.accessToken as string;
}

describeContact('étape 17 coordonnées', () => {
  const db = createPrismaClient();
  let communeId: string;
  let categoryId: string;

  async function worker(prefix = '81') {
    const s = await session(prefix);
    await db.workerProfile.create({
      data: { userId: s.userId, displayName: 'Candidat 17', communeId, mainCategoryId: categoryId, isAvailable: true, termsAcceptedAt: new Date() },
    });
    await db.user.update({ where: { id: s.userId }, data: { status: 'ACTIVE' } });
    return s;
  }

  async function employer() {
    const s = await session('82');
    await db.employerProfile.create({ data: { userId: s.userId, type: 'BUSINESS', displayName: 'Recruteur 17', communeId } });
    await db.user.update({ where: { id: s.userId }, data: { status: 'ACTIVE', activeMode: 'EMPLOYER' } });
    return s;
  }

  async function job(employerId: string, places = 1) {
    const row = await db.job.create({
      data: {
        employerId,
        title: `17 mission ${randomUUID().slice(0, 6)}`,
        description: 'Mission de test étape 17.',
        categoryId,
        communeId,
        publicLandmark: 'près du marché',
        publicLatitude: -4.31,
        publicLongitude: 15.31,
        addressPrivate: ADDRESS,
        privateLatitude: -4.3123,
        privateLongitude: 15.3134,
        missionPhone: '+243999999999',
        startAt: new Date(Date.now() + 3 * DAY),
        durationHours: 3,
        workersNeeded: places,
        amount: 1500,
        currency: 'USD',
        payUnit: 'MISSION',
        payChannel: 'CASH',
        applyDeadline: new Date(Date.now() + 2 * DAY),
        selectionDeadline: new Date(Date.now() + 2.5 * DAY),
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    return row.id;
  }

  /** Candidature → proposition → acceptation. Retourne aussi la réponse d’acceptation. */
  async function accepted(places = 1) {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId, places);
    const app = await db.application.create({
      data: { jobId, workerId: c.userId, status: 'SUBMITTED', amount: 1500, currency: 'USD', payUnit: 'MISSION', communeName: 'Gombe' },
    });
    const offer = await api('POST', `/applications/${app.id}/offer`, { token: r.token, key: randomUUID() });
    const acceptKey = randomUUID();
    const accept = await api('POST', `/selection-offers/${offer.json.id as string}/accept`, { token: c.token, key: acceptKey });
    expect(accept.status).toBe(200);
    return { r, c, jobId, applicationId: app.id, participationId: accept.json.participationId as string, accept, acceptKey, offerId: offer.json.id as string };
  }

  const contact = (id: string, token: string) => api('GET', `/participations/${id}/contact`, { token });

  beforeAll(async () => {
    const commune = await db.commune.findFirst({ where: { name: 'Gombe' } });
    const category = await db.category.findFirst({ where: { slug: 'demenagement-et-chargement' } });
    communeId = commune!.id;
    categoryId = category!.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('17-A avant acceptation : aucune coordonnée nulle part', async () => {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId);
    await db.application.create({
      data: { jobId, workerId: c.userId, status: 'SUBMITTED', amount: 1500, currency: 'USD', payUnit: 'MISSION', communeName: 'Gombe' },
    });
    for (const res of [
      await api('GET', `/jobs/${jobId}`),
      await api('GET', `/jobs/${jobId}`, { token: c.token }),
      await api('GET', `/jobs/${jobId}/my-application`, { token: c.token }),
      await api('GET', `/jobs/${jobId}/applications`, { token: r.token }),
    ]) {
      expect(res.raw).not.toContain('avenue secrète');
      expect(res.raw).not.toMatch(/addressPrivate|privateLatitude|missionPhone|"phone"/);
    }
  });

  it('17-B après acceptation : les deux parties voient numéro et adresse, no-store ; le public ne change pas', async () => {
    const r0 = await employer();
    const publicBefore = await api('GET', `/jobs/${await job(r0.userId)}`);
    const { r, c, jobId, participationId, accept } = await accepted();

    // Le candidat qui accepte reçoit le contact dans la réponse.
    const inAccept = accept.json.contact as Record<string, unknown>;
    expect(inAccept.addressPrivate).toBe(ADDRESS);
    expect(inAccept.missionPhone).toBe(r.phone);

    const asWorker = await contact(participationId, c.token);
    expect(asWorker.status).toBe(200);
    expect(asWorker.headers.get('cache-control')).toBe('no-store');
    expect(asWorker.json.addressPrivate).toBe(ADDRESS);
    expect(asWorker.json.privateLatitude).toBeCloseTo(-4.3123);
    // D15 : numéro du recruteur = users.phone, pas le mission_phone non validé.
    expect(asWorker.json.missionPhone).toBe(r.phone);
    expect(asWorker.raw).not.toContain('+243999999999');
    expect((asWorker.json.counterpart as { phone: string }).phone).toBe(r.phone);
    expect(asWorker.json).not.toHaveProperty('workerPhone');

    const asEmployer = await contact(participationId, r.token);
    expect(asEmployer.status).toBe(200);
    expect(asEmployer.headers.get('cache-control')).toBe('no-store');
    expect((asEmployer.json.counterpart as { phone: string }).phone).toBe(c.phone);

    const publicAfter = await api('GET', `/jobs/${jobId}`);
    expect(publicAfter.raw).not.toContain('avenue secrète');
    expect(publicAfter.raw).not.toMatch(/addressPrivate|privateLatitude|privateLongitude|missionPhone/);
    expect(Object.keys(publicAfter.json).sort()).toEqual(Object.keys(publicBefore.json).sort());
  });

  it('17-C / 17-I tiers : autre recruteur, autre candidat, partie d’une autre mission → 404', async () => {
    const { participationId } = await accepted();
    const other = await accepted();
    const intruderEmployer = await employer();
    const intruderWorker = await worker();
    for (const token of [intruderEmployer.token, intruderWorker.token, other.c.token, other.r.token]) {
      const res = await contact(participationId, token);
      expect(res.status).toBe(404);
      expect(res.raw).not.toContain('avenue secrète');
    }
    expect((await api('GET', `/participations/${randomUUID()}/contact`, { token: intruderEmployer.token })).status).toBe(404);
  });

  it('17-D admin : super lit et laisse une trace sans adresse ; support, modo et finance reçoivent 403', async () => {
    const { participationId } = await accepted();
    const superToken = await adminToken('super');
    const res = await api('GET', `/admin/participations/${participationId}/contact`, { token: superToken });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.json.addressPrivate).toBe(ADDRESS);
    expect(await db.contactAccessLog.count({ where: { participationId } })).toBe(1);
    const audit = await db.auditLog.findMany({ where: { action: 'OPEN_CONTACT', entityId: participationId } });
    expect(audit).toHaveLength(1);
    expect(audit[0].metadata).toEqual({ participationId });
    expect(JSON.stringify(audit[0].metadata)).not.toMatch(/avenue|\+243/);

    for (const username of ['support', 'modo', 'finance']) {
      const denied = await api('GET', `/admin/participations/${participationId}/contact`, {
        token: await adminToken(username),
      });
      expect(denied.status).toBe(403);
      expect(denied.raw).not.toContain('avenue secrète');
    }
    expect(await db.contactAccessLog.count({ where: { participationId } })).toBe(1);
  });

  it('17-G / 17-H annulation : 404 pour les deux parties, révocation, place libérée, rejeu sans contact', async () => {
    const { r, c, jobId, participationId, offerId, acceptKey } = await accepted();
    expect((await db.job.findUniqueOrThrow({ where: { id: jobId } })).status).toBe('FILLED');

    const before = await contact(participationId, c.token);
    expect(before.status).toBe(200);
    expect(before.headers.get('cache-control')).toBe('no-store');

    const key = randomUUID();
    const cancel = await api('POST', `/participations/${participationId}/declarations`, {
      token: c.token,
      key,
      body: { outcome: 'CANCELLED' },
    });
    expect(cancel.status).toBe(200);
    expect(cancel.json.participationStatus).toBe('CANCELLED');

    expect((await contact(participationId, c.token)).status).toBe(404);
    expect((await contact(participationId, r.token)).status).toBe(404);
    const row = await db.participation.findUniqueOrThrow({ where: { id: participationId } });
    expect(row.status).toBe('CANCELLED');
    expect(row.contactRevokedAt).not.toBeNull();
    expect(row.workerOutcome).toBe('CANCELLED');
    // D20 : l’offre pourvue redevient publiée (date limite non passée).
    expect((await db.job.findUniqueOrThrow({ where: { id: jobId } })).status).toBe('PUBLISHED');
    expect(await db.notification.count({ where: { relatedId: participationId, templateKey: 'participation_cancelled' } })).toBe(2);

    // Rejeux : annulation (même clé) et acceptation (clé déjà enregistrée) ne renvoient plus de contact.
    const replayCancel = await api('POST', `/participations/${participationId}/declarations`, {
      token: c.token,
      key,
      body: { outcome: 'CANCELLED' },
    });
    expect(replayCancel.status).toBe(200);
    const replayAccept = await api('POST', `/selection-offers/${offerId}/accept`, { token: c.token, key: acceptKey });
    expect(replayAccept.status).toBe(200);
    expect(replayAccept.json).not.toHaveProperty('contact');
    expect(replayAccept.raw).not.toContain('avenue secrète');
    expect(await db.notification.count({ where: { relatedId: participationId, templateKey: 'participation_cancelled' } })).toBe(2);

    // La clé d’idempotence enregistrée ne contient jamais l’adresse.
    const stored = await db.idempotencyKey.findMany({ where: { userId: c.userId } });
    expect(JSON.stringify(stored.map((s) => s.responseBody))).not.toContain('avenue secrète');

    const publicPage = await api('GET', `/jobs/${jobId}`);
    expect(publicPage.raw).not.toContain('avenue secrète');
  });

  it('déclaration : un tiers reçoit 404, les autres issues attendent l’étape 20', async () => {
    const { participationId, r } = await accepted();
    const intruder = await worker();
    const res = await api('POST', `/participations/${participationId}/declarations`, {
      token: intruder.token,
      key: randomUUID(),
      body: { outcome: 'CANCELLED' },
    });
    expect(res.status).toBe(404);
    const later = await api('POST', `/participations/${participationId}/declarations`, {
      token: r.token,
      key: randomUUID(),
      body: { outcome: 'COMPLETED' },
    });
    expect(later.status).toBe(400);
    expect((await db.participation.findUniqueOrThrow({ where: { id: participationId } })).status).toBe('CONFIRMED');
  });
});
