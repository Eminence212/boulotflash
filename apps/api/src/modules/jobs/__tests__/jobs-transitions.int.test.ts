/**
 * Étape 12 — transitions offre / version / expiration partielle.
 * Nécessite API + DB (ENABLE_TEST_HOOKS, SEED_DEMO, SEED_ACTIVATE_DEMO_COMMUNES).
 */
import {
  createPrismaClient,
  generateTotpCode,
  TOTP_TEST_SECRET_DEFAULT,
} from '@boulotflash/database';

const hasDb =
  !!process.env.DATABASE_URL &&
  !!process.env.JWT_SECRET &&
  !!process.env.REDIS_URL;

const describeJobs = hasDb ? describe : describe.skip;

const API_BASE =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';

const ADMIN_PASSWORD = 'BoulotFlash-Admin-Test-1';

async function api(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; cookie?: string } = {},
): Promise<{ status: number; json: Record<string, unknown>; setCookies: string[] }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(opts.body !== undefined
        ? { 'content-type': 'application/json' }
        : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
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

function cookieHeader(setCookies: string[]): string {
  return setCookies
    .map((c) => c.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

async function devSession(phone: string, email?: string): Promise<string> {
  const { status, json } = await api('POST', '/auth/dev-session', {
    body: {
      email: email ?? `etape12-${Date.now()}@boulotflash.local`,
      phone,
      ageConfirmed: true,
      acceptTerms: true,
      acceptPrivacy: true,
    },
  });
  if (status >= 400 || typeof json.accessToken !== 'string') {
    throw new Error(`dev-session failed ${status} ${JSON.stringify(json)}`);
  }
  await api('PATCH', '/me', {
    token: json.accessToken,
    body: { displayName: 'Recette Étape12', phone },
  });
  return json.accessToken as string;
}

async function ensureEmployer(
  token: string,
  communeId: string,
  displayName: string,
): Promise<void> {
  const created = await api('POST', '/me/employer-profile', {
    token,
    body: {
      type: 'INDIVIDUAL',
      displayName,
      contactPerson: 'Responsable',
      communeId,
    },
  });
  expect([200, 201, 409]).toContain(created.status);
}

async function loginModo(): Promise<string> {
  const login = await api('POST', '/admin/auth/login', {
    body: { username: 'modo', password: ADMIN_PASSWORD },
  });
  expect(login.status).toBe(200);
  const cookie = cookieHeader(login.setCookies);
  const code = generateTotpCode(
    process.env.TOTP_TEST_SECRET?.trim() || TOTP_TEST_SECRET_DEFAULT,
  );
  const totp = await api('POST', '/admin/auth/totp', {
    body: { code },
    cookie,
  });
  expect(totp.status).toBe(200);
  return totp.json.accessToken as string;
}

function futureDraft(overrides: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  const apply = new Date(start.getTime() - 12 * 60 * 60 * 1000);
  const selection = new Date(start.getTime() - 60 * 60 * 1000);
  return {
    title: `Vente test ${Date.now()}`,
    description: 'Tenue de stand et encaissement pour une journée.',
    startAt: start.toISOString(),
    applyDeadline: apply.toISOString(),
    selectionDeadline: selection.toISOString(),
    durationHours: 4,
    workersNeeded: 2,
    amount: 1500,
    currency: 'USD',
    payUnit: 'MISSION',
    payChannel: 'CASH',
    payTiming: 'Fin',
    publicLandmark: 'Près du marché',
    addressPrivate: '10 avenue de test',
    atPrivateHome: false,
    ...overrides,
  };
}

describeJobs('étape 12 transitions offres', () => {
  const db = createPrismaClient();
  let gombeId: string;
  let catVenteId: string;
  let catElecId: string;
  let catMenageId: string;

  beforeAll(async () => {
    const gombe = await db.commune.findFirst({ where: { name: 'Gombe' } });
    const vente = await db.category.findFirst({
      where: { slug: 'vente-promotion-et-distribution' },
    });
    const elec = await db.category.findFirst({
      where: { slug: 'electricite' },
    });
    const menage = await db.category.findFirst({
      where: { slug: 'menage-et-nettoyage' },
    });
    if (!gombe || !vente || !elec || !menage) {
      throw new Error('Référentiel manquant — seed communes / catégories.');
    }
    gombeId = gombe.id;
    catVenteId = vente.id;
    catElecId = elec.id;
    catMenageId = menage.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('nouveau recruteur → IN_REVIEW ; modo approuve → PUBLISHED', async () => {
    const phone = `+24383${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);
    await ensureEmployer(token, gombeId, 'R-1 Test');

    const draft = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catVenteId,
        communeId: gombeId,
        title: `12-B vente ${Date.now()}`,
      }),
    });
    expect([200, 201]).toContain(draft.status);
    const jobId = draft.json.id as string;

    const submit = await api('POST', `/jobs/${jobId}/submit`, { token });
    expect([200, 201]).toContain(submit.status);
    expect(submit.json.status).toBe('IN_REVIEW');

    const publicList = await api('GET', '/jobs');
    const items = (publicList.json.items as Array<{ id: string }>) ?? [];
    expect(items.some((j) => j.id === jobId)).toBe(false);

    const adminToken = await loginModo();
    const approve = await api('POST', `/admin/jobs/${jobId}/approve`, {
      token: adminToken,
      body: {},
    });
    expect(approve.status).toBe(200);
    expect(approve.json.status).toBe('PUBLISHED');

    const right = await db.publicationRight.findFirst({
      where: { jobId, source: 'FREE', type: 'POST' },
    });
    expect(right?.status).toBe('USED');
  });

  it('rejet avec motif puis resoumission → IN_REVIEW', async () => {
    const phone = `+24384${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);
    await ensureEmployer(token, gombeId, 'R-rej Test');

    const draft = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catVenteId,
        communeId: gombeId,
        title: `12-D rejet ${Date.now()}`,
      }),
    });
    const jobId = draft.json.id as string;
    await api('POST', `/jobs/${jobId}/submit`, { token });

    const adminToken = await loginModo();
    const reject = await api('POST', `/admin/jobs/${jobId}/reject`, {
      token: adminToken,
      body: { reason: 'Tâche trop vague' },
    });
    expect(reject.status).toBe(200);
    expect(reject.json.status).toBe('REJECTED');
    expect(reject.json.rejectionReason).toBe('Tâche trop vague');

    const mine = await api('GET', '/jobs/mine', { token });
    const row = (
      (mine.json.items as Array<{ id: string; rejectionReason?: string }>) ?? []
    ).find((j) => j.id === jobId);
    expect(row?.rejectionReason).toBe('Tâche trop vague');

    await api('PUT', `/jobs/${jobId}`, {
      token,
      body: { description: 'Description corrigée et plus précise pour la vente.' },
    });
    const resubmit = await api('POST', `/jobs/${jobId}/submit`, { token });
    expect([200, 201]).toContain(resubmit.status);
    expect(resubmit.json.status).toBe('IN_REVIEW');
  });

  it('catégorie sensible reste IN_REVIEW même après historique', async () => {
    const phone = `+24385${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);
    await ensureEmployer(token, gombeId, 'R-2 Test');

    const first = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catVenteId,
        communeId: gombeId,
        title: `12-E hist ${Date.now()}`,
      }),
    });
    const firstId = first.json.id as string;
    await api('POST', `/jobs/${firstId}/submit`, { token });
    const adminToken = await loginModo();
    await api('POST', `/admin/jobs/${firstId}/approve`, {
      token: adminToken,
      body: {},
    });

    const elec = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catElecId,
        communeId: gombeId,
        title: `12-E elec ${Date.now()}`,
        description: 'Intervention électrique légère sous supervision.',
      }),
    });
    const elecId = elec.json.id as string;
    const submit = await api('POST', `/jobs/${elecId}/submit`, { token });
    expect([200, 201]).toContain(submit.status);
    expect(submit.json.status).toBe('IN_REVIEW');

    const vente2 = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catVenteId,
        communeId: gombeId,
        title: `12-E vente2 ${Date.now()}`,
      }),
    });
    const vente2Id = vente2.json.id as string;
    const direct = await api('POST', `/jobs/${vente2Id}/submit`, { token });
    expect([200, 201]).toContain(direct.status);
    expect(direct.json.status).toBe('PUBLISHED');
  });

  it('ménage à domicile → revue ; sans domicile suit règle non sensible', async () => {
    const phone = `+24386${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);
    await ensureEmployer(token, gombeId, 'R-menage');

    // historique positif
    const hist = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catVenteId,
        communeId: gombeId,
        title: `hist menage ${Date.now()}`,
      }),
    });
    await api('POST', `/jobs/${hist.json.id as string}/submit`, { token });
    const adminToken = await loginModo();
    await api('POST', `/admin/jobs/${hist.json.id as string}/approve`, {
      token: adminToken,
      body: {},
    });

    const home = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catMenageId,
        communeId: gombeId,
        title: `12-F home ${Date.now()}`,
        description: 'Ménage complet appartement deux pièces.',
        atPrivateHome: true,
      }),
    });
    const homeSubmit = await api('POST', `/jobs/${home.json.id as string}/submit`, {
      token,
    });
    expect(homeSubmit.json.status).toBe('IN_REVIEW');

    const office = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catMenageId,
        communeId: gombeId,
        title: `12-F office ${Date.now()}`,
        description: 'Nettoyage bureau open-space après événement.',
        atPrivateHome: false,
      }),
    });
    const officeSubmit = await api(
      'POST',
      `/jobs/${office.json.id as string}/submit`,
      { token },
    );
    expect(officeSubmit.json.status).toBe('PUBLISHED');
  });

  it('mots interdits refusés à la soumission', async () => {
    const phone = `+24387${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);
    await ensureEmployer(token, gombeId, 'R-interdit');

    const draft = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catVenteId,
        communeId: gombeId,
        title: `12-G ${Date.now()}`,
        description: 'Travail en hauteur pour un mineur sur stand.',
      }),
    });
    const submit = await api('POST', `/jobs/${draft.json.id as string}/submit`, {
      token,
    });
    expect(submit.status).toBe(400);
    expect(String(submit.json.message)).toMatch(/interdit/i);
  });

  it('modification montant → nouvelle version ; participation inchangée', async () => {
    const phone = `+24388${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);
    await ensureEmployer(token, gombeId, 'R-version');
    const employer = await db.user.findFirst({ where: { phone } });
    expect(employer).toBeTruthy();

    const draft = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catVenteId,
        communeId: gombeId,
        title: `12-H ${Date.now()}`,
        workersNeeded: 2,
      }),
    });
    const jobId = draft.json.id as string;
    await api('POST', `/jobs/${jobId}/submit`, { token });
    const adminToken = await loginModo();
    await api('POST', `/admin/jobs/${jobId}/approve`, {
      token: adminToken,
      body: {},
    });

    const jobBefore = await db.job.findUnique({
      where: { id: jobId },
      select: { currentVersionId: true, amount: true },
    });
    expect(jobBefore?.currentVersionId).toBeTruthy();

    const workerPhone = `+24389${String(Date.now()).slice(-7)}`;
    const workerToken = await devSession(
      workerPhone,
      `worker-${Date.now()}@bf.local`,
    );
    await api('PUT', '/me/worker-profile', {
      token: workerToken,
      body: {
        displayName: 'Candidat Version',
        communeId: gombeId,
        mainCategoryId: catVenteId,
        isAvailable: true,
        availability: [{ weekday: 1, slot: 'MORNING' }],
      },
    });
    const worker = await db.user.findFirst({
      where: { phone: workerPhone },
      select: { id: true },
    });
    expect(worker).toBeTruthy();

    const application = await db.application.create({
      data: {
        jobId,
        workerId: worker!.id,
        status: 'ACCEPTED',
      },
    });
    const offer = await db.selectionOffer.create({
      data: {
        applicationId: application.id,
        jobVersionId: jobBefore!.currentVersionId!,
        expiresAt: new Date(Date.now() + 3600_000),
        status: 'ACCEPTED',
      },
    });
    const participation = await db.participation.create({
      data: {
        applicationId: application.id,
        selectionOfferId: offer.id,
        jobId,
        workerId: worker!.id,
        employerId: employer!.id,
        jobVersionId: jobBefore!.currentVersionId!,
        status: 'CONFIRMED',
      },
    });

    const put = await api('PUT', `/jobs/${jobId}`, {
      token,
      body: { amount: 2500 },
    });
    expect(put.status).toBe(200);
    expect(put.json.status).toBe('IN_REVIEW');

    const versions = await db.jobVersion.findMany({
      where: { jobId },
      orderBy: { versionNumber: 'asc' },
    });
    expect(versions.length).toBeGreaterThanOrEqual(2);

    const frozen = await db.participation.findUnique({
      where: { id: participation.id },
      select: { jobVersionId: true },
    });
    expect(frozen?.jobVersionId).toBe(jobBefore!.currentVersionId);

    const jobAfter = await db.job.findUnique({
      where: { id: jobId },
      select: { amount: true, currentVersionId: true },
    });
    expect(jobAfter?.amount).toBe(2500);
    expect(jobAfter?.currentVersionId).not.toBe(jobBefore!.currentVersionId);
  });

  it('abonnement inactif → SUBSCRIPTION_INACTIVE', async () => {
    const phone = `+24380${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);
    await ensureEmployer(token, gombeId, 'R-abo');
    const user = await db.user.findFirst({ where: { phone } });
    expect(user).toBeTruthy();
    await db.subscription.update({
      where: { employerId: user!.id },
      data: { status: 'EXPIRED', endsAt: new Date() },
    });

    const draft = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catVenteId,
        communeId: gombeId,
      }),
    });
    expect(draft.status).toBe(403);
    expect(draft.json.code).toBe('SUBSCRIPTION_INACTIVE');
  });

  it('clôture partielle : applicationsOpen false sans EXPIRED', async () => {
    const phone = `+24381${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);
    await ensureEmployer(token, gombeId, 'R-partial');
    const employer = await db.user.findFirst({ where: { phone } });

    const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const applyPast = new Date(Date.now() - 60 * 60 * 1000);
    const selection = new Date(start.getTime() - 30 * 60 * 1000);

    const draft = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catVenteId,
        communeId: gombeId,
        title: `12-K ${Date.now()}`,
        workersNeeded: 2,
        startAt: start.toISOString(),
        applyDeadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        selectionDeadline: selection.toISOString(),
      }),
    });
    const jobId = draft.json.id as string;
    await api('POST', `/jobs/${jobId}/submit`, { token });
    const adminToken = await loginModo();
    await api('POST', `/admin/jobs/${jobId}/approve`, {
      token: adminToken,
      body: {},
    });

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { currentVersionId: true },
    });
    const workerPhone = `+24382${String(Date.now()).slice(-7)}`;
    const workerToken = await devSession(
      workerPhone,
      `w-k-${Date.now()}@bf.local`,
    );
    await api('PUT', '/me/worker-profile', {
      token: workerToken,
      body: {
        displayName: 'Candidat K',
        communeId: gombeId,
        mainCategoryId: catVenteId,
        isAvailable: true,
        availability: [{ weekday: 1, slot: 'MORNING' }],
      },
    });
    const worker = await db.user.findFirst({ where: { phone: workerPhone } });
    const application = await db.application.create({
      data: { jobId, workerId: worker!.id, status: 'ACCEPTED' },
    });
    const offer = await db.selectionOffer.create({
      data: {
        applicationId: application.id,
        jobVersionId: job!.currentVersionId!,
        expiresAt: new Date(Date.now() + 3600_000),
        status: 'ACCEPTED',
      },
    });
    await db.participation.create({
      data: {
        applicationId: application.id,
        selectionOfferId: offer.id,
        jobId,
        workerId: worker!.id,
        employerId: employer!.id,
        jobVersionId: job!.currentVersionId!,
        status: 'CONFIRMED',
      },
    });

    await db.job.update({
      where: { id: jobId },
      data: { applyDeadline: applyPast },
    });

    const detail = await api('GET', `/jobs/${jobId}`, { token });
    expect(detail.status).toBe(200);
    expect(detail.json.status).toBe('PUBLISHED');
    expect(detail.json.applicationsOpen).toBe(false);

    const apply = await api('POST', `/jobs/${jobId}/applications`, {
      token: workerToken,
    });
    expect(apply.status).toBe(409);
    expect(apply.json.code).toBe('OFFER_NOT_OPEN');
  });

  it('republier → nouvel id brouillon sans candidatures', async () => {
    const phone = `+24370${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);
    await ensureEmployer(token, gombeId, 'R-repub');

    const draft = await api('POST', '/jobs', {
      token,
      body: futureDraft({
        categoryId: catVenteId,
        communeId: gombeId,
        title: `12-L ${Date.now()}`,
      }),
    });
    const jobId = draft.json.id as string;
    await api('POST', `/jobs/${jobId}/submit`, { token });
    const adminToken = await loginModo();
    await api('POST', `/admin/jobs/${jobId}/approve`, {
      token: adminToken,
      body: {},
    });

    const otherPhone = `+24371${String(Date.now()).slice(-7)}`;
    await devSession(otherPhone, `other-${Date.now()}@bf.local`);
    const other = await db.user.findFirst({ where: { phone: otherPhone } });
    await db.application.create({
      data: {
        jobId,
        workerId: other!.id,
        status: 'SUBMITTED',
      },
    });

    const copy = await api('POST', `/jobs/${jobId}/republish`, { token });
    expect([200, 201]).toContain(copy.status);
    expect(copy.json.id).not.toBe(jobId);
    expect(copy.json.status).toBe('DRAFT');
    expect(copy.json.applicationsCount ?? 0).toBe(0);
  });
});

