/**
 * Étape 16 — propositions, réservation, acceptation, expiration, concurrence.
 * API réelle + Postgres réel (ENABLE_TEST_HOOKS, SEED_DEMO). Requêtes réellement parallèles.
 * À lancer en série : `jest --runInBand` (l’horloge de test est partagée par l’instance).
 */
import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { createPrismaClient, EXPIRE_JOB, SELECTION_QUEUE } from '@boulotflash/database';

const hasDb = !!process.env.DATABASE_URL && !!process.env.JWT_SECRET && !!process.env.REDIS_URL;
const describeSelection = hasDb ? describe : describe.skip;

const API_BASE = process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Res = { status: number; json: Record<string, unknown>; raw: string };

async function api(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; key?: string } = {},
): Promise<Res> {
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
  const raw = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return { status: res.status, json, raw };
}

let seq = 0;
function phone(prefix: string): string {
  seq += 1;
  return `+243${prefix}${String(Date.now() + seq).slice(-7)}`;
}

async function session(): Promise<{ token: string; userId: string }> {
  const created = await api('POST', '/auth/dev-session', {
    body: {
      email: `etape16-${randomUUID()}@boulotflash.local`,
      ageConfirmed: true,
      acceptTerms: true,
      acceptPrivacy: true,
    },
  });
  if (typeof created.json.accessToken !== 'string') {
    throw new Error(`dev-session ${created.status} ${created.raw}`);
  }
  const token = created.json.accessToken;
  await api('PATCH', '/me', { token, body: { displayName: 'Recette Étape16', phone: phone('81') } });
  const me = await api('GET', '/me', { token });
  return { token, userId: me.json.id as string };
}

describeSelection('étape 16 sélection', () => {
  const db = createPrismaClient();
  let communeId: string;
  let categoryId: string;

  async function worker() {
    const s = await session();
    const profile = await db.workerProfile.upsert({
      where: { userId: s.userId },
      create: {
        userId: s.userId,
        displayName: 'Candidat 16',
        communeId,
        mainCategoryId: categoryId,
        isAvailable: true,
        termsAcceptedAt: new Date(),
      },
      update: {},
    });
    await db.workerAvailability.create({
      data: { workerProfileId: profile.id, weekday: 2, slot: 'MORNING' },
    });
    await db.user.update({ where: { id: s.userId }, data: { status: 'ACTIVE' } });
    return s;
  }

  async function employer() {
    const s = await session();
    await db.employerProfile.create({
      data: { userId: s.userId, type: 'BUSINESS', displayName: 'Recruteur 16', communeId },
    });
    await db.user.update({ where: { id: s.userId }, data: { status: 'ACTIVE', activeMode: 'EMPLOYER' } });
    return s;
  }

  async function job(employerId: string, opts: { places?: number; selectionInMs?: number } = {}) {
    const start = new Date(Date.now() + 3 * DAY);
    const row = await db.job.create({
      data: {
        employerId,
        title: `16 déménagement ${randomUUID().slice(0, 6)}`,
        description: 'Chargement et déchargement d’un camion.',
        categoryId,
        communeId,
        publicLandmark: 'rond-point',
        addressPrivate: '7 avenue secrète, Gombe',
        startAt: start,
        durationHours: 3,
        workersNeeded: opts.places ?? 1,
        amount: 2000,
        currency: 'USD',
        payUnit: 'MISSION',
        payChannel: 'CASH',
        applyDeadline: new Date(Date.now() + 2 * DAY),
        selectionDeadline: new Date(Date.now() + (opts.selectionInMs ?? 2.5 * DAY)),
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    return row.id;
  }

  async function application(jobId: string, workerId: string) {
    const row = await db.application.create({
      data: { jobId, workerId, status: 'SUBMITTED', amount: 2000, currency: 'USD', payUnit: 'MISSION', communeName: 'Gombe' },
      select: { id: true },
    });
    return row.id;
  }

  const offer = (applicationId: string, token: string, key = randomUUID()) =>
    api('POST', `/applications/${applicationId}/offer`, { token, key });
  const accept = (offerId: string, token: string, key = randomUUID()) =>
    api('POST', `/selection-offers/${offerId}/accept`, { token, key });
  const decline = (offerId: string, token: string, key = randomUUID()) =>
    api('POST', `/selection-offers/${offerId}/decline`, { token, key });
  const list = (jobId: string, token: string) => api('GET', `/jobs/${jobId}/applications`, { token });
  const occupied = async (jobId: string, token: string) =>
    ((await list(jobId, token)).json.job as { occupied: number }).occupied;
  const setClock = (at: Date | null) => api('POST', '/test/clock', { body: { at: at ? at.toISOString() : null } });

  beforeAll(async () => {
    const commune = await db.commune.findFirst({ where: { name: 'Gombe' } });
    const category = await db.category.findFirst({ where: { slug: 'demenagement-et-chargement' } });
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

  it('16-A présélection : statut Présélectionnée, aucune réservation, aucune ligne selection_offers', async () => {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId, { places: 2 });
    const appId = await application(jobId, c.userId);
    const before = await occupied(jobId, r.token);

    const res = await api('POST', `/applications/${appId}/shortlist`, { token: r.token });
    expect(res.status).toBe(200);
    expect(res.json.statusLabel).toBe('Présélectionnée');
    expect(await db.selectionOffer.count({ where: { applicationId: appId } })).toBe(0);
    expect(await occupied(jobId, r.token)).toBe(before);
  });

  it('16-B / 16-C proposition : échéance = maintenant + 2 h, une place en moins, JSON recruteur sans téléphone ni adresse', async () => {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId, { places: 2 });
    const appId = await application(jobId, c.userId);

    const t0 = Date.now();
    const res = await offer(appId, r.token);
    expect(res.status).toBe(201);
    expect(res.json.status).toBe('PENDING');
    expect(res.json.placesRemaining).toBe(1);
    const expiresAt = new Date(res.json.expiresAt as string).getTime();
    expect(Math.abs(expiresAt - (t0 + 2 * HOUR))).toBeLessThan(60_000);
    expect(await db.selectionOffer.count({ where: { applicationId: appId, status: 'PENDING' } })).toBe(1);
    expect(await db.notification.count({ where: { userId: c.userId, templateKey: 'selection_offer_created' } })).toBe(1);

    const listing = await list(jobId, r.token);
    expect(listing.status).toBe(200);
    expect(listing.raw).not.toMatch(/"phone"/);
    expect(listing.raw).not.toMatch(/\+243/);
    expect(listing.raw).not.toMatch(/address|avenue secrète/i);
    const item = (listing.json.items as Array<{ candidate: Record<string, unknown> }>)[0];
    expect(item.candidate.phoneBadge).toBe(true);
    expect(item.candidate.skills).toEqual(expect.arrayContaining([expect.any(String)]));
    expect((listing.json.job as { placesRemaining: number }).placesRemaining).toBe(1);
  });

  it('16-D acceptation : participation confirmée, occupées stable ; contact du candidat seulement (étape 17)', async () => {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId, { places: 2 });
    const appId = await application(jobId, c.userId);
    const made = await offer(appId, r.token);
    const before = await occupied(jobId, r.token);

    const res = await accept(made.json.id as string, c.token);
    expect(res.status).toBe(200);
    expect(res.json.applicationStatus).toBe('ACCEPTED');
    expect(res.json.participationStatus).toBe('CONFIRMED');
    expect(typeof res.json.participationId).toBe('string');
    // Depuis l’étape 17 (api.md) : le candidat qui accepte reçoit le contact, jamais un tiers.
    expect((res.json.contact as { addressPrivate: string }).addressPrivate).toBe('7 avenue secrète, Gombe');

    expect(await occupied(jobId, r.token)).toBe(before);
    expect(await db.participation.count({ where: { jobId } })).toBe(1);
    const row = await db.selectionOffer.findUniqueOrThrow({ where: { id: made.json.id as string } });
    expect(row.status).toBe('ACCEPTED');
    expect(await db.notification.count({ where: { userId: r.userId, templateKey: 'selection_offer_accepted' } })).toBe(1);
  });

  it('16-E déclin : proposition Déclinée, la place redevient proposable', async () => {
    const r = await employer();
    const [c1, c2] = [await worker(), await worker()];
    const jobId = await job(r.userId, { places: 1 });
    const a1 = await application(jobId, c1.userId);
    const a2 = await application(jobId, c2.userId);
    const made = await offer(a1, r.token);
    expect((await offer(a2, r.token)).json.code).toBe('SLOT_FULL');

    const res = await decline(made.json.id as string, c1.token);
    expect(res.status).toBe(200);
    expect(res.json.applicationStatusLabel).toBe('Déclinée');
    expect(await occupied(jobId, r.token)).toBe(0);
    expect((await offer(a2, r.token)).status).toBe(201);
  });

  it('16-F expiration : refus à l’échéance et après, même avant le worker ; place libre', async () => {
    const r = await employer();
    const [c1, c2] = [await worker(), await worker()];
    const jobId = await job(r.userId, { places: 2 });
    const o1 = await offer(await application(jobId, c1.userId), r.token);
    const o2 = await offer(await application(jobId, c2.userId), r.token);
    const expiresAt = new Date(o1.json.expiresAt as string);

    // Exactement à l’échéance : déjà expirée.
    await setClock(expiresAt);
    const atDeadline = await accept(o1.json.id as string, c1.token);
    expect(atDeadline.status).toBe(409);
    expect(atDeadline.json.code).toBe('PROPOSAL_EXPIRED');
    expect(atDeadline.json.message).toBe('Cette proposition a expiré.');

    // Après l’échéance, sans balayage ni worker passé.
    await setClock(new Date(expiresAt.getTime() + 60_000));
    const after = await accept(o2.json.id as string, c2.token);
    expect(after.json.code).toBe('PROPOSAL_EXPIRED');

    expect(await db.participation.count({ where: { jobId } })).toBe(0);
    for (const id of [o1.json.id, o2.json.id] as string[]) {
      expect((await db.selectionOffer.findUniqueOrThrow({ where: { id } })).status).toBe('EXPIRED');
    }
    expect(await occupied(jobId, r.token)).toBe(0);
    const statuses = await db.application.findMany({ where: { jobId }, select: { status: true } });
    expect(statuses.every((s) => s.status === 'EXPIRED')).toBe(true);
  });

  it('balayage : rejoué et parallèle, une seule expiration et une notification par partie', async () => {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId);
    const made = await offer(await application(jobId, c.userId), r.token);
    const offerId = made.json.id as string;
    await setClock(new Date(new Date(made.json.expiresAt as string).getTime() + 1000));

    const sweeps = await Promise.all([1, 2, 3].map(() => api('POST', '/test/run-expirations')));
    expect(sweeps.every((s) => s.status === 200)).toBe(true);
    const again = await api('POST', '/test/run-expirations');
    expect(again.status).toBe(200);

    expect((await db.selectionOffer.findUniqueOrThrow({ where: { id: offerId } })).status).toBe('EXPIRED');
    expect(await db.notification.count({ where: { relatedId: offerId, templateKey: 'selection_offer_expired' } })).toBe(2);
    const late = await accept(offerId, c.token);
    expect(late.json.code).toBe('PROPOSAL_EXPIRED');
  });

  it('worker BullMQ : expire une proposition échue ; un balayage ensuite ne duplique rien', async () => {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId);
    const made = await offer(await application(jobId, c.userId), r.token);
    const offerId = made.json.id as string;
    // Échéance déplacée dans le passé (heure réelle) pour que le worker, qui suit l’heure réelle, l’expire.
    await db.selectionOffer.update({ where: { id: offerId }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const queue = new Queue(SELECTION_QUEUE, { connection: { url: process.env.REDIS_URL!, maxRetriesPerRequest: null } });
    await queue.add(EXPIRE_JOB, { offerId }, { jobId: `test-expire-${offerId}` });
    await queue.add(EXPIRE_JOB, { offerId }, { jobId: `test-expire-bis-${offerId}` });
    let status = 'PENDING';
    for (let i = 0; i < 60 && status === 'PENDING'; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      status = (await db.selectionOffer.findUniqueOrThrow({ where: { id: offerId } })).status;
    }
    await queue.close();
    expect(status).toBe('EXPIRED');

    await api('POST', '/test/run-expirations');
    expect(await db.notification.count({ where: { relatedId: offerId, templateKey: 'selection_offer_expired' } })).toBe(2);
    expect((await db.application.findFirstOrThrow({ where: { jobId } })).status).toBe('EXPIRED');
  });

  it('16-G clôture trop proche : PROPOSAL_TOO_SHORT, aucune écriture partielle', async () => {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId, { selectionInMs: 30 * 60 * 1000 });
    const appId = await application(jobId, c.userId);
    const key = randomUUID();

    const res = await offer(appId, r.token, key);
    expect(res.status).toBe(409);
    expect(res.json.code).toBe('PROPOSAL_TOO_SHORT');
    expect(await db.selectionOffer.count({ where: { applicationId: appId } })).toBe(0);
    expect((await db.application.findUniqueOrThrow({ where: { id: appId } })).status).toBe('SUBMITTED');
    expect(await db.idempotencyKey.count({ where: { userId: r.userId, key } })).toBe(0);
    expect(await db.notification.count({ where: { userId: c.userId } })).toBe(0);
  });

  it('16-H deux propositions parallèles sur la dernière place : une 201, une 409 SLOT_FULL, une seule PENDING', async () => {
    const r = await employer();
    const [ca, cb] = [await worker(), await worker()];
    const jobId = await job(r.userId, { places: 1 });
    const [a, b] = [await application(jobId, ca.userId), await application(jobId, cb.userId)];

    const results = await Promise.all([offer(a, r.token, randomUUID()), offer(b, r.token, randomUUID())]);
    expect(results.map((x) => x.status).sort()).toEqual([201, 409]);
    const loser = results.find((x) => x.status === 409)!;
    expect(loser.json.code).toBe('SLOT_FULL');
    expect(loser.json.message).toBe("Il n'y a plus de place à réserver.");
    expect(await db.selectionOffer.count({ where: { status: 'PENDING', application: { jobId } } })).toBe(1);
  });

  it('même clé envoyée deux fois en parallèle : même réponse, une seule proposition', async () => {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId, { places: 2 });
    const appId = await application(jobId, c.userId);
    const key = randomUUID();
    const [x, y] = await Promise.all([offer(appId, r.token, key), offer(appId, r.token, key)]);
    expect([x.status, y.status]).toEqual([201, 201]);
    expect(x.json.id).toBe(y.json.id);
    expect(await db.selectionOffer.count({ where: { applicationId: appId } })).toBe(1);

    const other = await api('POST', `/applications/${randomUUID()}/offer`, { token: r.token, key });
    expect(other.status).toBe(404);
  });

  it('16-I double acceptation et rejeu : une seule participation, même réponse', async () => {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId, { places: 2 });
    const made = await offer(await application(jobId, c.userId), r.token);
    const offerId = made.json.id as string;
    const key = randomUUID();

    const results = await Promise.all([
      accept(offerId, c.token, key),
      accept(offerId, c.token, key),
      accept(offerId, c.token, randomUUID()),
    ]);
    expect(results.map((x) => x.status)).toEqual([200, 200, 200]);
    const ids = new Set(results.map((x) => x.json.participationId));
    expect(ids.size).toBe(1);
    const replay = await accept(offerId, c.token, key);
    expect(replay.json.participationId).toBe(results[0].json.participationId);
    expect(await db.participation.count({ where: { jobId } })).toBe(1);
    expect(await db.notification.count({ where: { userId: r.userId, templateKey: 'selection_offer_accepted' } })).toBe(1);
  });

  it('16-J fixture illégale (deux PENDING pour une place) : une acceptation gagne, l’autre SLOT_FULL', async () => {
    const r = await employer();
    const [ca, cb] = [await worker(), await worker()];
    const jobId = await job(r.userId, { places: 1 });
    const a = await application(jobId, ca.userId);
    const b = await application(jobId, cb.userId);
    const legal = await offer(a, r.token);
    expect(legal.status).toBe(201);

    // Fixture SQL volontairement invalide (test seulement) : le parcours normal refuserait cette seconde réservation.
    const legalRow = await db.selectionOffer.findUniqueOrThrow({ where: { id: legal.json.id as string } });
    const illegal = await db.selectionOffer.create({
      data: { applicationId: b, jobVersionId: legalRow.jobVersionId, expiresAt: legalRow.expiresAt, status: 'PENDING' },
    });
    await db.application.update({ where: { id: b }, data: { status: 'OFFERED' } });

    const results = await Promise.all([
      accept(legal.json.id as string, ca.token),
      accept(illegal.id, cb.token),
    ]);
    expect(results.map((x) => x.status).sort()).toEqual([200, 409]);
    expect(results.find((x) => x.status === 409)!.json.code).toBe('SLOT_FULL');
    expect(await db.participation.count({ where: { jobId, status: { not: 'CANCELLED' } } })).toBe(1);
    expect((await db.job.findUniqueOrThrow({ where: { id: jobId } })).status).toBe('FILLED');
  });

  it('16-K autre recruteur : 404 sur la liste et sur les actions', async () => {
    const owner = await employer();
    const intruder = await employer();
    const c = await worker();
    const jobId = await job(owner.userId);
    const appId = await application(jobId, c.userId);

    expect((await list(jobId, intruder.token)).status).toBe(404);
    expect((await api('POST', `/applications/${appId}/shortlist`, { token: intruder.token })).status).toBe(404);
    expect((await api('POST', `/applications/${appId}/reject`, { token: intruder.token })).status).toBe(404);
    expect((await offer(appId, intruder.token)).status).toBe(404);
    const made = await offer(appId, owner.token);
    expect((await accept(made.json.id as string, intruder.token)).status).toBe(404);
  });

  it('refus : in-app seulement, une notification même si rejoué', async () => {
    const r = await employer();
    const c = await worker();
    const jobId = await job(r.userId);
    const appId = await application(jobId, c.userId);
    expect((await api('POST', `/applications/${appId}/reject`, { token: r.token })).status).toBe(200);
    expect((await api('POST', `/applications/${appId}/reject`, { token: r.token })).status).toBe(200);
    const notes = await db.notification.findMany({ where: { userId: c.userId, templateKey: 'application_rejected' } });
    expect(notes).toHaveLength(1);
    expect(notes[0].channel).toBe('IN_APP');
  });

  it('16-L pourvue : FILLED à la capacité, workers_needed inchangé, plus de candidature', async () => {
    const r = await employer();
    const [c1, c2, late] = [await worker(), await worker(), await worker()];
    const jobId = await job(r.userId, { places: 2 });
    for (const c of [c1, c2]) {
      const made = await offer(await application(jobId, c.userId), r.token);
      expect((await accept(made.json.id as string, c.token)).status).toBe(200);
    }
    const row = await db.job.findUniqueOrThrow({ where: { id: jobId } });
    expect(row.status).toBe('FILLED');
    expect(row.workersNeeded).toBe(2);

    const apply = await api('POST', `/jobs/${jobId}/applications`, {
      token: late.token,
      key: randomUUID(),
      body: { availabilityConfirmed: true },
    });
    expect(apply.status).toBe(409);
    expect(apply.json.code).toBe('OFFER_NOT_OPEN');
    const listing = await list(jobId, r.token);
    expect((listing.json.job as { statusLabel: string; placesRemaining: number }).statusLabel).toBe('Pourvue');
    expect((listing.json.job as { placesRemaining: number }).placesRemaining).toBe(0);
  });
});
