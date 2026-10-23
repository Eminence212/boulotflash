/**
 * Étape 11 — profils, abonnement, gardes publication.
 * Nécessite API + DB (ENABLE_TEST_HOOKS, SEED_DEMO, SEED_ACTIVATE_DEMO_COMMUNES).
 */
import { createPrismaClient } from '@boulotflash/database';

const hasDb =
  !!process.env.DATABASE_URL &&
  !!process.env.JWT_SECRET &&
  !!process.env.REDIS_URL;

const describeProfiles = hasDb ? describe : describe.skip;

const API_BASE =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';

async function api(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string } = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

async function devSession(phone: string, email?: string): Promise<string> {
  const { status, json } = await api('POST', '/auth/dev-session', {
    body: {
      email: email ?? `etape11-${Date.now()}@boulotflash.local`,
      phone,
      ageConfirmed: true,
      acceptTerms: true,
      acceptPrivacy: true,
    },
  });
  if (status >= 400 || typeof json.accessToken !== 'string') {
    throw new Error(`dev-session failed ${status} ${JSON.stringify(json)}`);
  }
  // Compléter téléphone si le hook ne le pose pas
  await api('PATCH', '/me', {
    token: json.accessToken,
    body: {
      displayName: 'Recette Étape11',
      phone,
    },
  });
  return json.accessToken;
}

describeProfiles('étape 11 profils + abonnement', () => {
  const db = createPrismaClient();
  let lembaId: string;
  let gombeId: string;
  let catVenteId: string;
  let jPub1Id: string | null = null;

  beforeAll(async () => {
    const lemba = await db.commune.findFirst({ where: { name: 'Lemba' } });
    const gombe = await db.commune.findFirst({ where: { name: 'Gombe' } });
    const cat = await db.category.findFirst({
      where: { slug: 'vente-promotion-et-distribution' },
    });
    if (!lemba || !gombe || !cat) {
      throw new Error('Référentiel manquant — seed communes / catégories.');
    }
    lembaId = lemba.id;
    gombeId = gombe.id;
    catVenteId = cat.id;
    const job = await db.job.findFirst({
      where: { title: { startsWith: 'J-PUB-1' } },
    });
    jPub1Id = job?.id ?? null;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('transaction profil recruteur + abonnement ACTIVE, endsAt null', async () => {
    const phone = `+24382${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);

    const first = await api('POST', '/me/employer-profile', {
      token,
      body: {
        type: 'INDIVIDUAL',
        displayName: 'Particulier Test',
        contactPerson: 'Responsable',
        communeId: gombeId,
      },
    });
    expect([200, 201]).toContain(first.status);
    expect(first.json.created).toBe(true);
    const sub = first.json.subscription as { status?: string; endsAt?: unknown; label?: string };
    expect(sub?.status).toBe('ACTIVE');
    expect(sub?.endsAt).toBeNull();
    expect(sub?.label).toBe('Services gratuits');

    const user = await db.user.findFirst({ where: { phone } });
    expect(user).toBeTruthy();
    const count = await db.subscription.count({
      where: { employerId: user!.id },
    });
    expect(count).toBe(1);
  });

  it('idempotence : second POST /me/employer-profile sans second abonnement', async () => {
    const phone = `+24382${String(Date.now() + 1).slice(-7)}`;
    const token = await devSession(phone);

    await api('POST', '/me/employer-profile', {
      token,
      body: {
        type: 'INDIVIDUAL',
        displayName: 'Double Clic',
        communeId: gombeId,
      },
    });
    const second = await api('POST', '/me/employer-profile', {
      token,
      body: {
        type: 'INDIVIDUAL',
        displayName: 'Double Clic',
        communeId: gombeId,
      },
    });
    expect([200, 201]).toContain(second.status);
    expect(second.json.created).toBe(false);

    const user = await db.user.findFirst({ where: { phone } });
    const count = await db.subscription.count({
      where: { employerId: user!.id },
    });
    expect(count).toBe(1);
  });

  it('PUT worker-profile écrit worker_availability', async () => {
    const phone = `+24381${String(Date.now()).slice(-7)}`;
    const token = await devSession(phone);

    const put = await api('PUT', '/me/worker-profile', {
      token,
      body: {
        displayName: 'Candidat Complet',
        communeId: lembaId,
        mainCategoryId: catVenteId,
        isAvailable: true,
        availability: [{ weekday: 1, slot: 'MORNING' }],
      },
    });
    expect([200, 201]).toContain(put.status);

    const user = await db.user.findFirst({ where: { phone } });
    const profile = await db.workerProfile.findUnique({
      where: { userId: user!.id },
      include: { availability: true },
    });
    expect(profile?.availability).toHaveLength(1);
    expect(profile?.availability[0]?.weekday).toBe(1);
    expect(profile?.availability[0]?.slot).toBe('MORNING');
  });

  it('désactiver isAvailable sans fermer le compte', async () => {
    const phone = `+24381${String(Date.now() + 3).slice(-7)}`;
    const token = await devSession(phone);
    await api('PUT', '/me/worker-profile', {
      token,
      body: {
        displayName: 'Dispo Off',
        communeId: lembaId,
        mainCategoryId: catVenteId,
        availability: [{ weekday: 1, slot: 'MORNING' }],
      },
    });
    const off = await api('PUT', '/me/worker-profile/availability', {
      token,
      body: { isAvailable: false },
    });
    expect(off.status).toBe(200);
    const me = await api('GET', '/me', { token });
    expect(me.json.status).not.toBe('CLOSED');
    const wp = me.json.workerProfile as { isAvailable?: boolean };
    expect(wp?.isAvailable).toBe(false);
  });

  it('POST /jobs refuse abonnement EXPIRED → SUBSCRIPTION_INACTIVE', async () => {
    const phone = `+24382${String(Date.now() + 5).slice(-7)}`;
    const token = await devSession(phone);
    const me = await api('GET', '/me', { token });
    const userId = me.json.id as string;

    await db.employerProfile.upsert({
      where: { userId },
      create: {
        userId,
        type: 'INDIVIDUAL',
        displayName: 'Temp Exp',
        communeId: gombeId,
        phoneConfirmed: true,
      },
      update: {},
    });
    await db.subscription.upsert({
      where: { employerId: userId },
      create: { employerId: userId, status: 'EXPIRED' },
      update: { status: 'EXPIRED' },
    });
    await db.userRole.upsert({
      where: { userId_role: { userId, role: 'EMPLOYER' } },
      create: { userId, role: 'EMPLOYER' },
      update: {},
    });

    const gate = await api('POST', '/jobs', { token });
    expect(gate.status).toBe(403);
    expect(gate.json.code).toBe('SUBSCRIPTION_INACTIVE');
  });

  it('POST /jobs refuse compte SUSPENDED → FORBIDDEN', async () => {
    const phone = `+24382${String(Date.now() + 9).slice(-7)}`;
    const token = await devSession(phone);
    const me = await api('GET', '/me', { token });
    const userId = me.json.id as string;

    await db.employerProfile.upsert({
      where: { userId },
      create: {
        userId,
        type: 'INDIVIDUAL',
        displayName: 'Suspendu Test',
        communeId: gombeId,
        phoneConfirmed: true,
      },
      update: {},
    });
    await db.subscription.upsert({
      where: { employerId: userId },
      create: { employerId: userId, status: 'ACTIVE' },
      update: { status: 'ACTIVE' },
    });
    await db.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });

    const gate = await api('POST', '/jobs', { token });
    expect(gate.status).toBe(403);
    expect(gate.json.code).toBe('FORBIDDEN');
  });

  it('candidature profil incomplet → PROFILE_INCOMPLETE', async () => {
    if (!jPub1Id) return;
    const phone = `+24381${String(Date.now() + 11).slice(-7)}`;
    const token = await devSession(phone);
    const me = await api('GET', '/me', { token });
    const userId = me.json.id as string;

    await db.workerProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: 'Incomplet Temp',
        communeId: null,
        mainCategoryId: null,
      },
      update: { communeId: null, mainCategoryId: null },
    });
    await db.workerAvailability.deleteMany({
      where: { workerProfile: { userId } },
    });

    const apply = await api('POST', `/jobs/${jPub1Id}/applications`, {
      token,
    });
    expect(apply.status).toBe(403);
    expect(apply.json.code).toBe('PROFILE_INCOMPLETE');
  });
});
