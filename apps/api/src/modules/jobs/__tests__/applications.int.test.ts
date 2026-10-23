/**
 * Étape 15 — candidature, unicité, limite glissante, idempotence.
 * Nécessite API + DB (ENABLE_TEST_HOOKS, SEED_DEMO, SEED_ACTIVATE_DEMO_COMMUNES).
 */
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '@boulotflash/database';

const hasDb =
  !!process.env.DATABASE_URL &&
  !!process.env.JWT_SECRET &&
  !!process.env.REDIS_URL;

const describeApplications = hasDb ? describe : describe.skip;

const API_BASE =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';

const DAY_MS = 24 * 60 * 60 * 1000;

async function api(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; idempotencyKey?: string } = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(opts.body !== undefined
        ? { 'content-type': 'application/json' }
        : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.idempotencyKey
        ? { 'idempotency-key': opts.idempotencyKey }
        : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

let phoneSeq = 0;
function uniquePhone(prefix: string): string {
  phoneSeq += 1;
  return `+243${prefix}${String(Date.now() + phoneSeq).slice(-7)}`;
}

async function devSession(phone: string | null): Promise<{
  token: string;
  userId: string;
}> {
  const { status, json } = await api('POST', '/auth/dev-session', {
    body: {
      email: `etape15-${randomUUID()}@boulotflash.local`,
      ageConfirmed: true,
      acceptTerms: true,
      acceptPrivacy: true,
    },
  });
  if (status >= 400 || typeof json.accessToken !== 'string') {
    throw new Error(`dev-session failed ${status} ${JSON.stringify(json)}`);
  }
  const token = json.accessToken;
  if (phone) {
    await api('PATCH', '/me', {
      token,
      body: { displayName: 'Recette Étape15', phone },
    });
  }
  const me = await api('GET', '/me', { token });
  return { token, userId: me.json.id as string };
}

function applyBody() {
  return { availabilityConfirmed: true, message: 'Disponible toute la journée.' };
}

describeApplications('étape 15 candidatures', () => {
  const db = createPrismaClient();
  let communeId: string;
  let categoryId: string;
  let employerId: string;

  /** Candidat au profil complet, disponible, règles acceptées. */
  async function completeWorker(): Promise<{ token: string; userId: string }> {
    const session = await devSession(uniquePhone('81'));
    const profile = await db.workerProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        displayName: 'C-COMPLET Test',
        communeId,
        mainCategoryId: categoryId,
        isAvailable: true,
        termsAcceptedAt: new Date(),
      },
      update: {
        communeId,
        mainCategoryId: categoryId,
        isAvailable: true,
        termsAcceptedAt: new Date(),
      },
    });
    await db.workerAvailability.upsert({
      where: {
        workerProfileId_weekday_slot: {
          workerProfileId: profile.id,
          weekday: 1,
          slot: 'MORNING',
        },
      },
      create: { workerProfileId: profile.id, weekday: 1, slot: 'MORNING' },
      update: {},
    });
    await db.user.update({
      where: { id: session.userId },
      data: { status: 'ACTIVE' },
    });
    return session;
  }

  async function createJob(
    overrides: { status?: 'PUBLISHED' | 'IN_REVIEW'; employerId?: string } = {},
  ): Promise<string> {
    const start = new Date(Date.now() + 3 * DAY_MS);
    const job = await db.job.create({
      data: {
        employerId: overrides.employerId ?? employerId,
        title: `15 vente ${randomUUID().slice(0, 8)}`,
        description: 'Tenue de stand et encaissement pour une journée.',
        categoryId,
        communeId,
        publicLandmark: 'Près du marché',
        startAt: start,
        durationHours: 4,
        workersNeeded: 2,
        amount: 1500,
        currency: 'USD',
        payUnit: 'MISSION',
        payChannel: 'CASH',
        applyDeadline: new Date(start.getTime() - 12 * 60 * 60 * 1000),
        selectionDeadline: new Date(start.getTime() - 60 * 60 * 1000),
        status: overrides.status ?? 'PUBLISHED',
        publishedAt: overrides.status === 'IN_REVIEW' ? null : new Date(),
      },
      select: { id: true },
    });
    return job.id;
  }

  function apply(jobId: string, token: string, key = randomUUID()) {
    return api('POST', `/jobs/${jobId}/applications`, {
      token,
      body: applyBody(),
      idempotencyKey: key,
    });
  }

  function countRows(jobId: string, workerId: string) {
    return db.application.count({ where: { jobId, workerId } });
  }

  beforeAll(async () => {
    const commune = await db.commune.findFirst({ where: { name: 'Gombe' } });
    const category = await db.category.findFirst({
      where: { slug: 'vente-promotion-et-distribution' },
    });
    if (!commune || !category) {
      throw new Error('Référentiel manquant — seed communes / catégories.');
    }
    communeId = commune.id;
    categoryId = category.id;
    employerId = (await devSession(uniquePhone('82'))).userId;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('15-A / 15-B : 201 après écriture, puis ALREADY_APPLIED sans seconde ligne', async () => {
    const worker = await completeWorker();
    const jobId = await createJob();

    const first = await apply(jobId, worker.token);
    expect(first.status).toBe(201);
    expect(first.json.status).toBe('SUBMITTED');
    expect(first.json.message).toBe('Candidature envoyée');

    const row = await db.application.findFirst({
      where: { jobId, workerId: worker.userId },
    });
    expect(row?.amount).toBe(1500);
    expect(row?.currency).toBe('USD');
    expect(row?.communeName).toBe('Gombe');

    const mine = await api('GET', `/jobs/${jobId}/my-application`, {
      token: worker.token,
    });
    expect((mine.json.application as { status: string }).status).toBe(
      'SUBMITTED',
    );

    const second = await apply(jobId, worker.token);
    expect(second.status).toBe(409);
    expect(second.json.code).toBe('ALREADY_APPLIED');
    expect(second.json.message).toBe('Vous avez déjà postulé à cette mission.');
    expect(await countRows(jobId, worker.userId)).toBe(1);
  });

  it('15-C : le retrait ne permet pas de reposer', async () => {
    const worker = await completeWorker();
    const jobId = await createJob();
    const first = await apply(jobId, worker.token);
    expect(first.status).toBe(201);

    const withdraw = await api(
      'POST',
      `/applications/${first.json.id as string}/withdraw`,
      { token: worker.token },
    );
    expect(withdraw.status).toBe(200);
    expect(withdraw.json.status).toBe('WITHDRAWN');

    const again = await apply(jobId, worker.token);
    expect(again.status).toBe(409);
    expect(again.json.code).toBe('ALREADY_APPLIED');

    const twice = await api(
      'POST',
      `/applications/${first.json.id as string}/withdraw`,
      { token: worker.token },
    );
    expect(twice.status).toBe(409);

    const history = await api('GET', '/applications', { token: worker.token });
    const items = (history.json.items ?? history.json) as Array<{
      jobId?: string;
      status: string;
    }>;
    expect(Array.isArray(items)).toBe(true);
    expect(items.some((a) => a.status === 'WITHDRAWN')).toBe(true);
    expect(await countRows(jobId, worker.userId)).toBe(1);
  });

  it('15-D : sans téléphone → PHONE_REQUIRED', async () => {
    const noPhone = await devSession(null);
    const jobId = await createJob();
    const res = await apply(jobId, noPhone.token);
    expect(res.status).toBe(403);
    expect(res.json.code).toBe('PHONE_REQUIRED');
    expect(await countRows(jobId, noPhone.userId)).toBe(0);
  });

  it('15-E : propre offre → OWN_JOB', async () => {
    const worker = await completeWorker();
    const jobId = await createJob({ employerId: worker.userId });
    const res = await apply(jobId, worker.token);
    expect(res.status).toBe(409);
    expect(res.json.code).toBe('OWN_JOB');
    expect(await countRows(jobId, worker.userId)).toBe(0);
  });

  it('15-F : offre en revue → OFFER_NOT_OPEN, aucune ligne', async () => {
    const worker = await completeWorker();
    const jobId = await createJob({ status: 'IN_REVIEW' });
    const res = await apply(jobId, worker.token);
    expect([404, 409]).toContain(res.status);
    if (res.status === 409) expect(res.json.code).toBe('OFFER_NOT_OPEN');
    expect(await countRows(jobId, worker.userId)).toBe(0);
  });

  it('15-G : la 6e candidature de la fenêtre est refusée, retraits compris', async () => {
    const worker = await completeWorker();
    const jobs = await Promise.all(
      Array.from({ length: 6 }, () => createJob()),
    );
    for (const jobId of jobs.slice(0, 5)) {
      const res = await apply(jobId, worker.token);
      expect(res.status).toBe(201);
    }
    const firstRow = await db.application.findFirstOrThrow({
      where: { workerId: worker.userId, jobId: jobs[0] },
    });
    await api('POST', `/applications/${firstRow.id}/withdraw`, {
      token: worker.token,
    });

    const sixth = await apply(jobs[5]!, worker.token);
    expect(sixth.status).toBe(409);
    expect(sixth.json.code).toBe('RATE_LIMIT');
    expect(sixth.json.message).toBe('Vous avez atteint la limite du jour.');
    expect(JSON.stringify(sixth.json)).not.toMatch(/pay|paiement/i);
    expect(await countRows(jobs[5]!, worker.userId)).toBe(0);
  });

  it('15-G (concurrence) : 8 POST parallèles sur 8 offres → 5 lignes au plus', async () => {
    const worker = await completeWorker();
    const jobs = await Promise.all(
      Array.from({ length: 8 }, () => createJob()),
    );
    const results = await Promise.all(
      jobs.map((jobId) => apply(jobId, worker.token)),
    );
    const created = results.filter((r) => r.status === 201).length;
    const limited = results.filter(
      (r) => r.status === 409 && r.json.code === 'RATE_LIMIT',
    ).length;
    expect(created).toBe(5);
    expect(limited).toBe(3);
    expect(
      await db.application.count({ where: { workerId: worker.userId } }),
    ).toBe(5);
  });

  it('15-H : double clic, deux clés → une 201 et une 409 ALREADY_APPLIED', async () => {
    const worker = await completeWorker();
    const jobId = await createJob();
    const [a, b] = await Promise.all([
      apply(jobId, worker.token),
      apply(jobId, worker.token),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    const conflict = a.status === 409 ? a : b;
    expect(conflict.json.code).toBe('ALREADY_APPLIED');
    expect(await countRows(jobId, worker.userId)).toBe(1);
  });

  it('15-I : même clé rejouée → même réponse, pas de seconde ligne', async () => {
    const worker = await completeWorker();
    const jobId = await createJob();
    const key = randomUUID();

    const first = await apply(jobId, worker.token, key);
    const replay = await apply(jobId, worker.token, key);
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.json).toEqual(first.json);

    const [p1, p2] = await Promise.all([
      apply(jobId, worker.token, key),
      apply(jobId, worker.token, key),
    ]);
    expect(p1.status).toBe(201);
    expect(p2.status).toBe(201);
    expect(await countRows(jobId, worker.userId)).toBe(1);

    const otherBody = await api('POST', `/jobs/${jobId}/applications`, {
      token: worker.token,
      body: { availabilityConfirmed: true, message: 'Autre texte' },
      idempotencyKey: key,
    });
    expect(otherBody.status).toBe(409);
    expect(await countRows(jobId, worker.userId)).toBe(1);
  });

  it('15-K : disponibilité coupée → NOT_AVAILABLE', async () => {
    const worker = await completeWorker();
    await db.workerProfile.update({
      where: { userId: worker.userId },
      data: { isAvailable: false },
    });
    const jobId = await createJob();
    const res = await apply(jobId, worker.token);
    expect(res.status).toBe(409);
    expect(res.json.code).toBe('NOT_AVAILABLE');
    expect(res.json.message).toBe('Activez votre disponibilité pour postuler.');
    expect(await countRows(jobId, worker.userId)).toBe(0);
  });

  it('refuse sans case de disponibilité ni clé d’idempotence', async () => {
    const worker = await completeWorker();
    const jobId = await createJob();
    const noBox = await api('POST', `/jobs/${jobId}/applications`, {
      token: worker.token,
      body: { availabilityConfirmed: false },
      idempotencyKey: randomUUID(),
    });
    expect(noBox.status).toBe(400);
    const noKey = await api('POST', `/jobs/${jobId}/applications`, {
      token: worker.token,
      body: applyBody(),
    });
    expect(noKey.status).toBe(400);
    expect(await countRows(jobId, worker.userId)).toBe(0);
  });
});
