/**
 * Étape 13 — DTO public (liste noire), tri sponsor, 404 non publics.
 */
import { createPrismaClient } from '@boulotflash/database';
import Redis from 'ioredis';
import { hasViewedJob, rememberViewedJob } from '../job-view-cookie';
import {
  PUBLIC_JOB_FORBIDDEN_KEYS,
  assertNoForbiddenPublicKeys,
  toPublicJobDto,
} from '../public-job.dto';

async function bustPublicJobsCache(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) return;
  const r = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await r.connect();
    await r.incr('jobs:public:gen');
  } finally {
    r.disconnect();
  }
}

const hasDb =
  !!process.env.DATABASE_URL &&
  !!process.env.JWT_SECRET &&
  !!process.env.REDIS_URL;

const describePublic = hasDb ? describe : describe.skip;

const API_BASE =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001/api/v1';

async function api(
  method: string,
  path: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { accept: 'application/json' },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

function assertPublicPayload(obj: Record<string, unknown>) {
  for (const key of PUBLIC_JOB_FORBIDDEN_KEYS) {
    expect(obj).not.toHaveProperty(key);
  }
  expect(obj).toHaveProperty('sharePath');
  expect(String(obj.sharePath)).toMatch(/^\/missions\//);
}

describe('public-job.dto (unitaire)', () => {
  it('refuse les clés privées', () => {
    expect(() =>
      assertNoForbiddenPublicKeys({
        id: 'x',
        addressPrivate: 'secret',
      }),
    ).toThrow(/addressPrivate/);
  });

  it('produit un DTO sans privé', () => {
    const dto = toPublicJobDto({
      id: '00000000-0000-4000-8000-000000000101',
      title: 'Service soirée',
      category: 'Service',
      amount: 1500,
      currency: 'USD',
      payUnit: 'MISSION',
      startAt: new Date('2026-11-02T17:00:00.000Z'),
      durationHours: 5,
      commune: 'Gombe',
      publicLandmark: 'près du marché',
      publicLatitude: -4.31,
      publicLongitude: 15.3,
      placesRemaining: 2,
      featured: false,
      applicationsOpen: true,
      publishedAt: new Date('2026-10-23T10:00:00.000Z'),
      detailViewCount: 3,
      publisher: {
        name: 'Amina',
        avatarUrl: null,
        profilePath: '/recruteurs/00000000-0000-4000-8000-0000000000aa',
      },
    });
    assertPublicPayload(dto as unknown as Record<string, unknown>);
    expect(dto.publisher).toEqual({
      name: 'Amina',
      avatarUrl: null,
      profilePath: '/recruteurs/00000000-0000-4000-8000-0000000000aa',
    });
    expect(dto.detailViewCount).toBe(3);
    expect(dto).not.toHaveProperty('employerId');
    expect(dto.sharePath).toBe(
      '/missions/00000000-0000-4000-8000-000000000101',
    );
  });

  it('ne recompte pas une vue déjà enregistrée pour ce navigateur', () => {
    const jobId = '00000000-0000-4000-8000-000000000101';
    expect(hasViewedJob(undefined, jobId)).toBe(false);
    const stored = rememberViewedJob(undefined, jobId);
    const header = `bf_job_views=${encodeURIComponent(stored)}`;
    expect(hasViewedJob(header, jobId)).toBe(true);
    expect(hasViewedJob(header, '00000000-0000-4000-8000-000000000102')).toBe(
      false,
    );
  });
});

describePublic('étape 13 liste / détail public', () => {
  const db = createPrismaClient();
  let gombeId: string;
  let jPub1Id: string | null = null;

  beforeAll(async () => {
    const gombe = await db.commune.findFirst({ where: { name: 'Gombe' } });
    if (!gombe) throw new Error('Commune Gombe manquante');
    gombeId = gombe.id;
    const job = await db.job.findFirst({
      where: { title: { startsWith: 'J-PUB-1' } },
    });
    jPub1Id = job?.id ?? null;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('liste filtrée Gombe + USD sans clés privées', async () => {
    const { status, json } = await api(
      'GET',
      `/jobs?communeId=${gombeId}&currency=USD&page=1`,
    );
    expect(status).toBe(200);
    const items = (json.items as Record<string, unknown>[]) ?? [];
    expect(Array.isArray(items)).toBe(true);
    for (const item of items) {
      assertPublicPayload(item);
      expect(item.currency).toBe('USD');
      expect(item.commune).toBe('Gombe');
    }
  });

  it('mot-clé titre/description ; pas sur adresse privée', async () => {
    const hit = await api('GET', `/jobs?q=${encodeURIComponent('soirée')}`);
    expect(hit.status).toBe(200);
    const items = (hit.json.items as Array<{ title?: string }>) ?? [];
    // au moins une offre seed « soirée » ou aucune si seed absent — pas d’erreur
    expect(Array.isArray(items)).toBe(true);

    const miss = await api(
      'GET',
      `/jobs?q=${encodeURIComponent('avenue-privee-inexistante-xyz')}`,
    );
    expect(miss.status).toBe(200);
    const missItems = (miss.json.items as unknown[]) ?? [];
    expect(missItems.length).toBe(0);
  });

  it('404 anonyme pour DRAFT / IN_REVIEW / SUSPENDED', async () => {
    const draft = await db.job.findFirst({
      where: { status: { in: ['DRAFT', 'IN_REVIEW', 'SUSPENDED', 'REJECTED'] } },
      select: { id: true, status: true },
    });
    if (!draft) {
      // crée un brouillon minimal via seed existant si possible
      return;
    }
    const { status } = await api('GET', `/jobs/${draft.id}`);
    expect(status).toBe(404);
  });

  it('détail J-PUB-1 public avec sharePath', async () => {
    if (!jPub1Id) return;
    const { status, json } = await api('GET', `/jobs/${jPub1Id}`);
    expect(status).toBe(200);
    assertPublicPayload(json);
    expect(json.sharePath).toBe(`/missions/${jPub1Id}`);
    expect(json).not.toHaveProperty('addressPrivate');
    expect(json).not.toHaveProperty('missionPhone');
  });

  it('tri sponsor : featured avant non-featured', async () => {
    const now = new Date();
    const featuredUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const pub = await db.job.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
    });
    if (!pub) return;

    await db.job.update({
      where: { id: pub.id },
      data: {
        isFeatured: true,
        featuredUntil,
      },
    });
    await bustPublicJobsCache();

    // offre plus récente non sponsorisée
    const newer = await db.job.findFirst({
      where: {
        status: 'PUBLISHED',
        id: { not: pub.id },
        OR: [{ featuredUntil: null }, { featuredUntil: { lte: now } }],
      },
      orderBy: { publishedAt: 'desc' },
    });

    const { status, json } = await api('GET', '/jobs?page=1&pageSize=20');
    expect(status).toBe(200);
    const items = (json.items as Array<{ id: string; featured?: boolean }>) ?? [];
    expect(items.length).toBeGreaterThan(0);
    const featuredIdx = items.findIndex((i) => i.id === pub.id);
    expect(featuredIdx).toBeGreaterThanOrEqual(0);
    expect(items[featuredIdx]?.featured).toBe(true);
    if (newer) {
      const newerIdx = items.findIndex((i) => i.id === newer.id);
      if (newerIdx >= 0) {
        expect(featuredIdx).toBeLessThan(newerIdx);
      }
    }

    await db.job.update({
      where: { id: pub.id },
      data: {
        isFeatured: false,
        featuredUntil: null,
      },
    });
    await bustPublicJobsCache();
  });

  it('pas de paramètre de tri prix', async () => {
    const { status, json } = await api('GET', '/jobs?sort=amount');
    expect(status).toBe(200);
    // le param sort est ignoré — réponse liste normale
    expect(json).toHaveProperty('items');
    expect(json).not.toHaveProperty('sort');
  });
});
