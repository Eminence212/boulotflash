/**
 * Étape 19 — rappel de mission in-app (D16) et canal IN_APP seul.
 * API réelle + Postgres réel (ENABLE_TEST_HOOKS). L’horloge de test est partagée : `jest --runInBand`.
 */
import { randomUUID } from 'node:crypto';
import { createPrismaClient, generateTotpCode, TOTP_TEST_SECRET_DEFAULT } from '@boulotflash/database';

const hasDb = !!process.env.DATABASE_URL && !!process.env.JWT_SECRET && !!process.env.REDIS_URL;
const describeReminders = hasDb ? describe : describe.skip;

const API_BASE = process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';
const HOUR = 60 * 60 * 1000;

type Res = { status: number; json: Record<string, unknown> };

async function api(method: string, path: string, opts: { body?: unknown; token?: string; key?: string } = {}): Promise<Res> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.key ? { 'idempotency-key': opts.key } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

async function adminToken(username: string): Promise<string> {
  const login = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'BoulotFlash-Admin-Test-1' }),
  });
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const code = generateTotpCode(process.env.TOTP_TEST_SECRET?.trim() || TOTP_TEST_SECRET_DEFAULT);
  const totp = await fetch(`${API_BASE}/admin/auth/totp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ code }),
  });
  return ((await totp.json()) as { accessToken: string }).accessToken;
}

let seq = 0;
async function session(name: string): Promise<{ token: string; userId: string }> {
  const created = await api('POST', '/auth/dev-session', {
    body: { email: `etape19-${randomUUID()}@boulotflash.local`, ageConfirmed: true, acceptTerms: true, acceptPrivacy: true },
  });
  const token = created.json.accessToken as string;
  seq += 1;
  await api('PATCH', '/me', { token, body: { displayName: name, phone: `+24383${String(Date.now() + seq).slice(-7)}` } });
  const me = await api('GET', '/me', { token });
  return { token, userId: me.json.id as string };
}

describeReminders('étape 19 rappels', () => {
  const db = createPrismaClient();
  let communeId: string;
  let categoryId: string;

  const setClock = (at: Date | null) => api('POST', '/test/clock', { body: { at: at ? at.toISOString() : null } });
  const sweep = () => api('POST', '/test/run-reminders');
  const reminders = (participationId: string) =>
    db.notification.findMany({ where: { relatedId: participationId, templateKey: 'mission_reminder' } });

  /** Participation confirmée par le parcours réel : proposition du recruteur, acceptation du candidat. */
  async function confirmedParticipation(startInMs: number) {
    const employer = await session('Recruteur 19');
    await db.employerProfile.create({ data: { userId: employer.userId, type: 'BUSINESS', displayName: 'Recruteur 19', communeId } });
    const worker = await session('Candidat 19');
    await db.workerProfile.create({
      data: { userId: worker.userId, displayName: 'Candidat 19', communeId, mainCategoryId: categoryId, isAvailable: true, termsAcceptedAt: new Date() },
    });
    const startAt = new Date(Date.now() + startInMs);
    const job = await db.job.create({
      data: {
        employerId: employer.userId,
        title: `19 rappel ${randomUUID().slice(0, 6)}`,
        description: 'Mise en rayon.',
        categoryId,
        communeId,
        publicLandmark: 'marché',
        addressPrivate: '19 avenue privée, Gombe',
        startAt,
        durationHours: 3,
        workersNeeded: 1,
        amount: 1500,
        currency: 'USD',
        payUnit: 'MISSION',
        payChannel: 'CASH',
        applyDeadline: new Date(startAt.getTime() - 2 * HOUR),
        selectionDeadline: new Date(startAt.getTime() - HOUR),
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    const application = await db.application.create({
      data: { jobId: job.id, workerId: worker.userId, status: 'SUBMITTED', amount: 1500, currency: 'USD', payUnit: 'MISSION', communeName: 'Gombe' },
      select: { id: true },
    });
    const offer = await api('POST', `/applications/${application.id}/offer`, { token: employer.token, key: randomUUID() });
    expect(offer.status).toBe(201);
    const accepted = await api('POST', `/selection-offers/${offer.json.id as string}/accept`, { token: worker.token, key: randomUUID() });
    expect(accepted.status).toBe(200);
    return { participationId: accepted.json.participationId as string, startAt, employer, worker };
  }

  beforeAll(async () => {
    const commune = await db.commune.findFirst({ where: { name: 'Gombe' } });
    const category = await db.category.findFirst({ where: { slug: 'vente-promotion-et-distribution' } });
    if (!commune || !category) throw new Error('Référentiel manquant.');
    communeId = commune.id;
    categoryId = category.id;
  });

  afterEach(async () => {
    await setClock(null);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('19-A : rappel in-app aux deux parties à start_at − 3 h, une seule ligne au rejeu', async () => {
    const p = await confirmedParticipation(10 * HOUR);

    // Une minute avant la fenêtre : rien.
    await setClock(new Date(p.startAt.getTime() - 3 * HOUR - 60_000));
    expect((await sweep()).status).toBe(200);
    expect(await reminders(p.participationId)).toHaveLength(0);

    // Dans la fenêtre : une ligne IN_APP par partie.
    await setClock(new Date(p.startAt.getTime() - 3 * HOUR + 30_000));
    const first = await sweep();
    expect(first.json.hoursBefore).toBe(3);
    const rows = await reminders(p.participationId);
    expect(rows.map((r) => r.userId).sort()).toEqual([p.employer.userId, p.worker.userId].sort());
    expect(rows.every((r) => r.channel === 'IN_APP')).toBe(true);
    const toWorker = rows.find((r) => r.userId === p.worker.userId)!;
    expect(toWorker.message).toMatch(/^« 19 rappel .+ », .+, Gombe, commence dans 2 h 59\. Ouvrez les coordonnées pour retrouver l’adresse exacte et joindre le recruteur\.$/);
    expect(toWorker.message).not.toContain('avenue');
    expect(toWorker.message).not.toMatch(/\+?243\d/);

    // Rejeu, puis nouveau passage plus tard : toujours une ligne par personne.
    await sweep();
    await setClock(new Date(p.startAt.getTime() - HOUR));
    await sweep();
    expect(await reminders(p.participationId)).toHaveLength(2);

    // Le centre ouvre l’écran des coordonnées.
    const inbox = await api('GET', '/notifications', { token: p.worker.token });
    const item = (inbox.json.items as Array<{ type: string; href: string }>).find((i) => i.type === 'mission_reminder');
    expect(item?.href).toBe(`/participations/${p.participationId}`);
  });

  it('pas de rappel pour une participation annulée ni pour une mission déjà commencée', async () => {
    const cancelled = await confirmedParticipation(10 * HOUR);
    await api('POST', `/participations/${cancelled.participationId}/declarations`, {
      token: cancelled.worker.token,
      key: randomUUID(),
      body: { outcome: 'CANCELLED' },
    });
    await setClock(new Date(cancelled.startAt.getTime() - HOUR));
    await sweep();
    expect(await reminders(cancelled.participationId)).toHaveLength(0);

    await setClock(null);
    const started = await confirmedParticipation(10 * HOUR);
    await setClock(new Date(started.startAt.getTime() + 60_000));
    await sweep();
    expect(await reminders(started.participationId)).toHaveLength(0);
  });

  it('délai réglé par le super-admin dans platform_settings : appliqué au balayage, journalisé ; modo 403', async () => {
    const superToken = await adminToken('super');
    const before = await api('GET', '/admin/settings', { token: superToken });
    expect(before.status).toBe(200);
    expect(before.json.reminderHoursBefore).toBe(3);
    try {
      expect((await api('PATCH', '/admin/settings/reminder-hours', { token: superToken, body: { hours: 0 } })).status).toBe(400);
      expect((await api('PATCH', '/admin/settings/reminder-hours', { token: superToken, body: { hours: 2.5 } })).status).toBe(400);
      expect((await api('PATCH', '/admin/settings/reminder-hours', { token: superToken, body: { hours: 25 } })).status).toBe(400);
      const modo = await adminToken('modo');
      expect((await api('PATCH', '/admin/settings/reminder-hours', { token: modo, body: { hours: 5 } })).status).toBe(403);
      expect((await api('GET', '/admin/settings', { token: modo })).status).toBe(403);

      const changed = await api('PATCH', '/admin/settings/reminder-hours', { token: superToken, body: { hours: 5 } });
      expect(changed.status).toBe(200);
      expect(changed.json.reminderHoursBefore).toBe(5);
      const audit = await db.auditLog.findFirst({ where: { action: 'SETTINGS_REMINDER_HOURS' }, orderBy: { createdAt: 'desc' } });
      expect(audit?.metadata).toEqual({ previous: 3, next: 5 });

      // À start_at − 4 h 59 : hors fenêtre avec 3 h, dans la fenêtre avec 5 h.
      const p = await confirmedParticipation(10 * HOUR);
      await setClock(new Date(p.startAt.getTime() - 5 * HOUR + 60_000));
      const swept = await sweep();
      expect(swept.json.hoursBefore).toBe(5);
      expect(await reminders(p.participationId)).toHaveLength(2);
    } finally {
      await api('PATCH', '/admin/settings/reminder-hours', { token: superToken, body: { hours: 3 } });
    }
    expect((await api('GET', '/admin/settings', { token: superToken })).json.reminderHoursBefore).toBe(3);
  });

  it('19-D : à 22 h à Kinshasa, une candidature notifie le recruteur tout de suite, sans file push', async () => {
    const employer = await session('Recruteur 19-D');
    await db.employerProfile.create({ data: { userId: employer.userId, type: 'BUSINESS', displayName: 'Recruteur 19-D', communeId } });
    const worker = await session('Candidat 19-D');
    const profile = await db.workerProfile.create({
      data: { userId: worker.userId, displayName: 'Candidat 19-D', communeId, mainCategoryId: categoryId, isAvailable: true, termsAcceptedAt: new Date() },
    });
    await db.workerAvailability.create({ data: { workerProfileId: profile.id, weekday: 1, slot: 'EVENING' } });
    await db.user.update({ where: { id: worker.userId }, data: { status: 'ACTIVE' } });
    const job = await db.job.create({
      data: {
        employerId: employer.userId,
        title: `19-D nuit ${randomUUID().slice(0, 6)}`,
        description: 'Inventaire.',
        categoryId,
        communeId,
        publicLandmark: 'marché',
        startAt: new Date(Date.now() + 3 * 24 * HOUR),
        durationHours: 3,
        workersNeeded: 1,
        amount: 1500,
        currency: 'USD',
        payUnit: 'MISSION',
        payChannel: 'CASH',
        applyDeadline: new Date(Date.now() + 2 * 24 * HOUR),
        selectionDeadline: new Date(Date.now() + 2.5 * 24 * HOUR),
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    // 22:00 à Kinshasa = 21:00 UTC.
    const night = new Date();
    night.setUTCHours(21, 0, 0, 0);
    await setClock(night);
    const applied = await api('POST', `/jobs/${job.id}/applications`, {
      token: worker.token,
      key: randomUUID(),
      body: { availabilityConfirmed: true, message: '' },
    });
    expect(applied.status).toBe(201);
    const rows = await db.notification.findMany({ where: { userId: employer.userId, templateKey: 'application_submitted' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].channel).toBe('IN_APP');
    expect(rows[0].status).toBe('SENT');
  });

  it('le centre ne lit que le canal IN_APP', async () => {
    const s = await session('Candidat 19-canal');
    const email = await db.notification.create({
      data: { userId: s.userId, channel: 'EMAIL', templateKey: 'payment_receipt', title: 'Reçu', message: 'Reçu de paiement.', status: 'SENT' },
    });
    try {
      const inbox = await api('GET', '/notifications', { token: s.token });
      expect(inbox.json.items).toEqual([]);
      expect(inbox.json.unreadCount).toBe(0);
    } finally {
      // Ligne de test seulement : aucun e-mail réel n’existe avant l’étape 22.
      await db.notification.delete({ where: { id: email.id } });
    }
  });
});
