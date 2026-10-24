/**
 * Étape 18 — centre in-app, alerte de correspondance dédupliquée, matrice des événements.
 * API réelle + worker BullMQ réel + Postgres réel (ENABLE_TEST_HOOKS, SEED_DEMO). `jest --runInBand`.
 */
import { randomUUID } from 'node:crypto';
import {
  createPrismaClient,
  generateTotpCode,
  kinshasaWeekdaySlot,
  runJobMatch,
  TOTP_TEST_SECRET_DEFAULT,
} from '@boulotflash/database';

const hasDb = !!process.env.DATABASE_URL && !!process.env.JWT_SECRET && !!process.env.REDIS_URL;
const describeNotifications = hasDb ? describe : describe.skip;

const API_BASE = process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';
const ADMIN_PASSWORD = 'BoulotFlash-Admin-Test-1';
const DAY = 24 * 60 * 60 * 1000;
const ADDRESS = '18 avenue privée, Gombe';

type Res = { status: number; json: Record<string, unknown>; raw: string; cookies: string[] };
type Item = { id: string; type: string; title: string; message: string; href: string | null; read: boolean };

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
  return { status: res.status, json, raw, cookies: res.headers.getSetCookie() };
}

let seq = 0;
async function session(name: string): Promise<{ token: string; userId: string }> {
  const created = await api('POST', '/auth/dev-session', {
    body: { email: `etape18-${randomUUID()}@boulotflash.local`, ageConfirmed: true, acceptTerms: true, acceptPrivacy: true },
  });
  const token = created.json.accessToken as string;
  seq += 1;
  await api('PATCH', '/me', { token, body: { displayName: name, phone: `+24382${String(Date.now() + seq).slice(-7)}` } });
  const me = await api('GET', '/me', { token });
  return { token, userId: me.json.id as string };
}

async function modoToken(): Promise<string> {
  const login = await api('POST', '/admin/auth/login', { body: { username: 'modo', password: ADMIN_PASSWORD } });
  const cookie = login.cookies.map((c) => c.split(';')[0]).join('; ');
  const code = generateTotpCode(process.env.TOTP_TEST_SECRET?.trim() || TOTP_TEST_SECRET_DEFAULT);
  const totp = await api('POST', '/admin/auth/totp', { body: { code }, cookie });
  return totp.json.accessToken as string;
}

/** Prochain jour à `hour`:00 heure de Kinshasa (UTC+1), à au moins trois jours. */
function kinshasaAt(hour: number): Date {
  const d = new Date(Date.now() + 3 * DAY);
  d.setUTCHours(hour - 1, 0, 0, 0);
  return d;
}

async function waitFor<T>(read: () => Promise<T>, done: (v: T) => boolean, ms = 20000): Promise<T> {
  const until = Date.now() + ms;
  let value = await read();
  while (!done(value) && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 300));
    value = await read();
  }
  return value;
}

describeNotifications('étape 18 notifications', () => {
  const db = createPrismaClient();
  let communeId: string;
  let otherCommuneId: string;
  let categoryId: string;
  let otherCategoryId: string;

  /** Candidat semé en base, comme les fixtures C-* : profil, compétence, commune, disponibilités. */
  async function candidate(
    name: string,
    opts: {
      commune?: string | null;
      category?: string | null;
      available?: boolean;
      slots?: { weekday: number; slot: 'MORNING' | 'AFTERNOON' | 'EVENING' }[];
      userId?: string;
      token?: string;
    } = {},
  ) {
    const s = opts.userId ? { userId: opts.userId, token: opts.token! } : await session(name);
    const profile = await db.workerProfile.create({
      data: {
        userId: s.userId,
        displayName: name,
        communeId: opts.commune === undefined ? communeId : opts.commune,
        mainCategoryId: opts.category === undefined ? categoryId : opts.category,
        isAvailable: opts.available ?? true,
        termsAcceptedAt: new Date(),
      },
    });
    for (const slot of opts.slots ?? []) {
      await db.workerAvailability.create({ data: { workerProfileId: profile.id, ...slot } });
    }
    await db.user.update({ where: { id: s.userId }, data: { status: 'ACTIVE' } });
    return s;
  }

  async function employer(name: string) {
    const s = await session(name);
    const created = await api('POST', '/me/employer-profile', {
      token: s.token,
      body: { type: 'INDIVIDUAL', displayName: name, contactPerson: 'Responsable', communeId },
    });
    expect([200, 201]).toContain(created.status);
    return s;
  }

  function draft(startAt: Date, overrides: Record<string, unknown> = {}) {
    return {
      title: `18 vente ${randomUUID().slice(0, 6)}`,
      description: 'Tenue de stand et encaissement pour une soirée.',
      categoryId,
      communeId,
      startAt: startAt.toISOString(),
      applyDeadline: new Date(startAt.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      selectionDeadline: new Date(startAt.getTime() - 60 * 60 * 1000).toISOString(),
      durationHours: 4,
      workersNeeded: 2,
      amount: 1500,
      currency: 'USD',
      payUnit: 'MISSION',
      payChannel: 'CASH',
      payTiming: 'Fin',
      publicLandmark: 'Près du marché',
      addressPrivate: ADDRESS,
      atPrivateHome: false,
      ...overrides,
    };
  }

  /**
   * Publication réelle. Premier dépôt d’un recruteur → IN_REVIEW puis approbation `modo` ; dépôts
   * suivants → PUBLISHED directement à la soumission. Les deux chemins mettent l’alerte en file.
   */
  async function publish(token: string, startAt: Date): Promise<string> {
    const created = await api('POST', '/jobs', { token, body: draft(startAt) });
    expect([200, 201]).toContain(created.status);
    const jobId = created.json.id as string;
    const submitted = await api('POST', `/jobs/${jobId}/submit`, { token });
    if (submitted.json.status === 'IN_REVIEW') {
      const approved = await api('POST', `/admin/jobs/${jobId}/approve`, { token: await modoToken(), body: {} });
      expect(approved.json.status).toBe('PUBLISHED');
    } else {
      expect(submitted.json.status).toBe('PUBLISHED');
    }
    return jobId;
  }

  const matchCount = (jobId: string, userId?: string) =>
    db.notification.count({ where: { relatedId: jobId, templateKey: 'job_match', ...(userId ? { userId } : {}) } });

  async function inbox(token: string, unread = false) {
    const res = await api('GET', `/notifications${unread ? '?unread=1' : ''}`, { token });
    expect(res.status).toBe(200);
    return res.json as { unreadCount: number; items: Item[] };
  }

  beforeAll(async () => {
    const gombe = await db.commune.findFirst({ where: { name: 'Gombe' } });
    const lemba = await db.commune.findFirst({ where: { name: 'Lemba' } });
    const vente = await db.category.findFirst({ where: { slug: 'vente-promotion-et-distribution' } });
    const menage = await db.category.findFirst({ where: { slug: 'menage-et-nettoyage' } });
    if (!gombe || !lemba || !vente || !menage) throw new Error('Référentiel manquant.');
    communeId = gombe.id;
    otherCommuneId = lemba.id;
    categoryId = vente.id;
    otherCategoryId = menage.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('18-A à 18-F : première publication → une alerte in-app au seul profil correspondant ; rejeu sans doublon', async () => {
    const start = kinshasaAt(19);
    const { weekday } = kinshasaWeekdaySlot(start);
    const evening = [{ weekday, slot: 'EVENING' as const }];

    const match = await candidate('Grâce 18', { slots: evening });
    const otherCommune = await candidate('Autre commune 18', { commune: otherCommuneId, slots: evening });
    const otherSkill = await candidate('Autre compétence 18', { category: otherCategoryId, slots: evening });
    const incomplete = await candidate('Incomplet 18', { commune: null, category: null, slots: evening });
    const unavailable = await candidate('Indisponible 18', { available: false, slots: evening });
    const morningOnly = await candidate('Matin 18', { slots: [{ weekday, slot: 'MORNING' }] });
    const author = await employer('Recruteur 18');
    // 18-C : l’auteur a aussi le mode candidat avec le même profil.
    await candidate('Auteur candidat 18', { slots: evening, userId: author.userId, token: author.token });

    const jobId = await publish(author.token, start);

    // Le worker traite la file : une alerte pour Grâce, et rien pour les autres profils de ce test.
    // (D’autres comptes correspondants peuvent exister en base : les comptes se font par personne.)
    expect(await waitFor(() => matchCount(jobId, match.userId), (n) => n >= 1)).toBe(1);
    for (const other of [otherCommune, otherSkill, incomplete, unavailable, morningOnly, author]) {
      expect(await matchCount(jobId, other.userId)).toBe(0);
      expect(await db.jobProfileAlert.count({ where: { jobId, userId: other.userId } })).toBe(0);
    }
    expect(await db.jobProfileAlert.count({ where: { jobId, userId: match.userId } })).toBe(1);

    // Canal : IN_APP seulement (l’enum n’a pas de FCM ; aucune ligne EMAIL).
    const rows = await db.notification.findMany({ where: { relatedId: jobId } });
    expect(rows.every((r) => r.channel === 'IN_APP')).toBe(true);
    expect(await db.notification.count({ where: { relatedId: jobId, channel: 'EMAIL' } })).toBe(0);

    // 18-J : deux phrases, heure, commune, rémunération ; ni adresse ni numéro.
    const item = (await inbox(match.token)).items.find((i) => i.type === 'job_match')!;
    expect(item.title).toBe('Une mission correspond à votre profil');
    // Deux phrases : les repères publics, puis l’action.
    expect(item.message).toMatch(
      /^« 18 vente .+ », [a-z]{3}\. \d{1,2} [a-zé]+\.?, 19 h, Gombe, 15 USD la mission\. Ouvrez l’offre pour postuler ; l’adresse exacte n’est pas dans ce message\.$/,
    );
    expect(item.message).not.toContain('avenue');
    expect(item.message).not.toMatch(/\+?243\d/);
    expect(item.href).toBe(`/missions/${jobId}`);

    // 18-D : processor relancé à la main → aucune ligne de plus, toujours une alerte pour Grâce.
    const [totalBefore, alertsBefore] = [await matchCount(jobId), await db.jobProfileAlert.count({ where: { jobId } })];
    const rerun = await runJobMatch(db, jobId);
    expect(rerun).toMatchObject({ alertsCreated: 0, notificationsCreated: 0 });
    expect(await matchCount(jobId)).toBe(totalBefore);
    expect(await db.jobProfileAlert.count({ where: { jobId } })).toBe(alertsBefore);
    expect(await matchCount(jobId, match.userId)).toBe(1);
  });

  it('18-G créneau : offre à 10 h → seul le profil du matin ; à 19 h → seul le profil du soir', async () => {
    const morningStart = kinshasaAt(10);
    const { weekday } = kinshasaWeekdaySlot(morningStart);
    const r = await employer('Recruteur 18-G');
    const evening = await candidate('Soir 18-G', { slots: [{ weekday, slot: 'EVENING' }] });
    const morning = await candidate('Matin 18-G', { slots: [{ weekday, slot: 'MORNING' }] });

    const morningJob = await publish(r.token, morningStart);
    await waitFor(() => matchCount(morningJob, morning.userId), (n) => n >= 1);
    expect(await matchCount(morningJob, morning.userId)).toBe(1);
    expect(await matchCount(morningJob, evening.userId)).toBe(0);

    const eveningJob = await publish(r.token, kinshasaAt(19));
    await waitFor(() => matchCount(eveningJob, evening.userId), (n) => n >= 1);
    expect(await matchCount(eveningJob, evening.userId)).toBe(1);
    expect(await matchCount(eveningJob, morning.userId)).toBe(0);
  });

  it('18-I modification importante : candidats prévenus, aucune seconde alerte de correspondance', async () => {
    const start = kinshasaAt(19);
    const { weekday } = kinshasaWeekdaySlot(start);
    const r = await employer('Recruteur 18-I');
    const c = await candidate('Candidat 18-I', { slots: [{ weekday, slot: 'EVENING' }] });
    const jobId = await publish(r.token, start);
    await waitFor(() => matchCount(jobId, c.userId), (n) => n >= 1);
    await db.application.create({
      data: { jobId, workerId: c.userId, status: 'SUBMITTED', amount: 1500, currency: 'USD', payUnit: 'MISSION', communeName: 'Gombe' },
    });
    const alertsBefore = await db.jobProfileAlert.count({ where: { jobId } });
    const matchesBefore = await matchCount(jobId);

    const changed = await api('PUT', `/jobs/${jobId}`, { token: r.token, body: { amount: 2000 } });
    expect(changed.status).toBe(200);
    expect(changed.json.status).toBe('IN_REVIEW');
    const notice = (await inbox(c.token)).items.find((i) => i.type === 'job_changed');
    expect(notice?.message).toMatch(/20 USD la mission, et repasse en validation/);
    expect(notice?.message).not.toContain('avenue');

    // Réapprobation : `publishedAt` est conservé, donc rien n’est remis en file.
    const reapproved = await api('POST', `/admin/jobs/${jobId}/approve`, { token: await modoToken(), body: {} });
    expect(reapproved.json.status).toBe('PUBLISHED');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(await matchCount(jobId)).toBe(matchesBefore);
    expect(await matchCount(jobId, c.userId)).toBe(1);
    expect(await db.jobProfileAlert.count({ where: { jobId } })).toBe(alertsBefore);
  });

  it('18-H matrice : candidature, présélection, proposition, acceptation, déclin, refus, suspension', async () => {
    const start = kinshasaAt(19);
    const { weekday } = kinshasaWeekdaySlot(start);
    const evening = [{ weekday, slot: 'EVENING' as const }];
    const r = await employer('Recruteur 18-H');
    const jobId = await publish(r.token, start);
    const [a, b, c] = await Promise.all([
      candidate('Alice 18-H', { slots: evening }),
      candidate('Bruno 18-H', { slots: evening }),
      candidate('Carla 18-H', { slots: evening }),
    ]);
    const applyAs = async (token: string) => {
      const res = await api('POST', `/jobs/${jobId}/applications`, {
        token,
        key: randomUUID(),
        body: { availabilityConfirmed: true, message: '' },
      });
      expect(res.status).toBe(201);
      return res.json.id as string;
    };
    const [appA, appB, appC] = [await applyAs(a.token), await applyAs(b.token), await applyAs(c.token)];

    // Nouvelle candidature → recruteur.
    const submitted = (await inbox(r.token)).items.filter((i) => i.type === 'application_submitted');
    expect(submitted).toHaveLength(3);
    expect(submitted.some((i) => i.message.startsWith('Alice 18-H a postulé à'))).toBe(true);
    expect(submitted[0].href).toBe(`/missions/${jobId}/candidatures`);

    // Présélection → candidat ; proposition → candidat ; acceptation → les deux.
    expect((await api('POST', `/applications/${appA}/shortlist`, { token: r.token })).status).toBe(200);
    const offerA = await api('POST', `/applications/${appA}/offer`, { token: r.token, key: randomUUID() });
    expect(offerA.status).toBe(201);
    const accepted = await api('POST', `/selection-offers/${offerA.json.id as string}/accept`, { token: a.token, key: randomUUID() });
    expect(accepted.status).toBe(200);
    const aTypes = (await inbox(a.token)).items.map((i) => i.type);
    expect(aTypes).toEqual(expect.arrayContaining(['application_shortlisted', 'selection_offer_created', 'selection_offer_accepted']));
    const proposal = (await inbox(a.token)).items.find((i) => i.type === 'selection_offer_created')!;
    expect(proposal.message).toMatch(/^Pour « .+ », .+19 h, Gombe, 15 USD la mission\. Acceptez ou déclinez avant .+ ; l’adresse exacte s’affiche après acceptation\.$/);
    const confirmedA = (await inbox(a.token)).items.find((i) => i.type === 'selection_offer_accepted')!;
    expect(confirmedA.href).toMatch(/^\/participations\//);
    expect((await inbox(r.token)).items.some((i) => i.type === 'selection_offer_accepted' && i.message.startsWith('Alice 18-H a accepté'))).toBe(true);

    // Déclin → recruteur ; refus → candidat.
    const offerB = await api('POST', `/applications/${appB}/offer`, { token: r.token, key: randomUUID() });
    await api('POST', `/selection-offers/${offerB.json.id as string}/decline`, { token: b.token, key: randomUUID() });
    expect((await inbox(r.token)).items.some((i) => i.type === 'selection_offer_declined' && i.message.startsWith('Bruno 18-H a décliné'))).toBe(true);
    await api('POST', `/applications/${appC}/reject`, { token: r.token });
    expect((await inbox(c.token)).items.some((i) => i.type === 'application_rejected')).toBe(true);

    // Suspension → recruteur (avec motif) et candidats concernés (sans motif).
    const suspended = await api('POST', `/admin/jobs/${jobId}/suspend`, { token: await modoToken(), body: { reason: 'Contrôle 18-H' } });
    expect(suspended.status).toBe(200);
    expect((await inbox(r.token)).items.find((i) => i.type === 'job_suspended')?.message).toMatch(/Motif : Contrôle 18-H$/);
    const toA = (await inbox(a.token)).items.find((i) => i.type === 'job_suspended');
    expect(toA?.message).not.toContain('Contrôle');
    // Bruno a décliné et Carla est refusée : ils ne sont plus concernés.
    expect((await inbox(b.token)).items.some((i) => i.type === 'job_suspended')).toBe(false);
    expect((await inbox(c.token)).items.some((i) => i.type === 'job_suspended')).toBe(false);

    // Aucune ligne hors IN_APP, aucune adresse ni numéro dans les textes.
    const all = await db.notification.findMany({ where: { userId: { in: [r.userId, a.userId, b.userId, c.userId] } } });
    expect(all.length).toBeGreaterThanOrEqual(10);
    expect(all.every((n) => n.channel === 'IN_APP')).toBe(true);
    expect(all.some((n) => n.message.includes('avenue') || /\+?243\d/.test(n.message))).toBe(false);
  });

  it('centre : lu / non lu, filtre ?unread=1, ligne d’un autre compte → 404', async () => {
    const r = await employer('Recruteur 18-lu');
    const c = await candidate('Candidat 18-lu', { slots: [] });
    const jobId = await publish(r.token, kinshasaAt(19));
    const applied = await db.application.create({
      data: { jobId, workerId: c.userId, status: 'SUBMITTED', amount: 1500, currency: 'USD', payUnit: 'MISSION', communeName: 'Gombe' },
    });
    await api('POST', `/applications/${applied.id}/shortlist`, { token: r.token });

    const before = await inbox(c.token);
    expect(before.unreadCount).toBe(1);
    const target = before.items[0];
    expect(target.read).toBe(false);

    expect((await api('POST', `/notifications/${target.id}/read`, { token: r.token })).status).toBe(404);
    expect((await api('POST', '/notifications/pas-un-uuid/read', { token: c.token })).status).toBe(404);
    const read = await api('POST', `/notifications/${target.id}/read`, { token: c.token });
    expect(read.status).toBe(201);
    expect(read.json.read).toBe(true);
    const again = await api('POST', `/notifications/${target.id}/read`, { token: c.token });
    expect(again.json.readAt).toBe(read.json.readAt);

    const after = await inbox(c.token);
    expect(after.unreadCount).toBe(0);
    expect(after.items[0].read).toBe(true);
    expect((await inbox(c.token, true)).items).toHaveLength(0);
    expect((await api('GET', '/notifications')).status).toBe(401);
  });
});
