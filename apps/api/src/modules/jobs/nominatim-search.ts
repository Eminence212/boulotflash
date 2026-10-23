import { createHash } from 'node:crypto';
import { simulatedGeocode } from '@boulotflash/contracts';
import { isInDrc } from '../geo/user-location';

export const NOMINATIM_CACHE_TTL_SEC = 300;

export type GeoPoint = { latitude: number; longitude: number };

export type CacheStore = {
  get(key: string): Promise<GeoPoint | null | undefined>;
  set(key: string, point: GeoPoint | null): Promise<void>;
};

export function nominatimAdapter(): 'simulated' | 'live' {
  const raw = process.env.NOMINATIM_ADAPTER?.trim().toLowerCase();
  if (raw === 'live' || raw === 'simulated') return raw;
  return process.env.APP_ENV === 'production' ? 'live' : 'simulated';
}

export function nominatimSearchUrl(query: string): string {
  const base = (
    process.env.NOMINATIM_BASE_URL?.trim() ||
    'https://nominatim.openstreetmap.org'
  ).replace(/\/$/, '');
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    addressdetails: '0',
    'accept-language': 'fr',
    q: query,
  });
  return `${base}/search?${params.toString()}`;
}

/** Premier résultat Nominatim, uniquement s’il tombe en RDC. */
export function parseNominatimBody(body: unknown): GeoPoint | null {
  if (!Array.isArray(body) || body.length === 0) return null;
  const first = body[0] as { lat?: unknown; lon?: unknown };
  const latitude = Number(first?.lat);
  const longitude = Number(first?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!isInDrc(latitude, longitude)) return null;
  return { latitude, longitude };
}

export function nominatimCacheKey(
  kind: 'public' | 'private',
  query: string,
): string {
  const digest = createHash('sha256')
    .update(`${kind}\n${query.trim().toLowerCase()}`)
    .digest('hex');
  return `nominatim:v1:${digest}`;
}

export function memoryCache(): CacheStore {
  const memory = new Map<string, { at: number; point: GeoPoint | null }>();
  return {
    async get(key) {
      const fresh = memory.get(key);
      if (!fresh || Date.now() - fresh.at >= NOMINATIM_CACHE_TTL_SEC * 1000) {
        return undefined;
      }
      return fresh.point;
    },
    async set(key, point) {
      memory.set(key, { at: Date.now(), point });
    },
  };
}

export async function lookupPoint(
  query: string,
  kind: 'public' | 'private',
  userAgent: string,
  cache: CacheStore,
  fetchImpl: typeof fetch = fetch,
  onRequest?: (status: number) => void,
): Promise<GeoPoint | null> {
  if (nominatimAdapter() !== 'live') {
    return simulatedGeocode(query, kind);
  }
  const key = nominatimCacheKey(kind, query);
  const cached = await cache.get(key);
  if (cached !== undefined) return cached;

  const response = await fetchImpl(nominatimSearchUrl(query), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'fr',
      'User-Agent': userAgent,
    },
    signal: AbortSignal.timeout(4000),
  });
  onRequest?.(response.status);
  const body = response.ok ? await response.json() : null;
  const point = parseNominatimBody(body);
  await cache.set(key, point);
  return point;
}

/** null = ne rien écrire (identifiant absent ou rien à géocoder). */
export async function resolveJobCoords(input: {
  userAgent: string;
  landmark?: string | null;
  address?: string | null;
  place: string;
  cache: CacheStore;
  fetchImpl?: typeof fetch;
  onRequest?: (status: number) => void;
}): Promise<{
  publicLatitude?: number | null;
  publicLongitude?: number | null;
  privateLatitude?: number | null;
  privateLongitude?: number | null;
} | null> {
  if (!input.userAgent.trim()) return null;

  const data: {
    publicLatitude?: number | null;
    publicLongitude?: number | null;
    privateLatitude?: number | null;
    privateLongitude?: number | null;
  } = {};
  const fetchImpl = input.fetchImpl ?? fetch;

  const landmark = input.landmark?.trim();
  if (landmark) {
    const point = await lookupPoint(
      `${landmark}, ${input.place}`,
      'public',
      input.userAgent,
      input.cache,
      fetchImpl,
      input.onRequest,
    );
    data.publicLatitude = point?.latitude ?? null;
    data.publicLongitude = point?.longitude ?? null;
  }

  const address = input.address?.trim();
  if (address) {
    const point = await lookupPoint(
      `${address}, ${input.place}`,
      'private',
      input.userAgent,
      input.cache,
      fetchImpl,
      input.onRequest,
    );
    data.privateLatitude = point?.latitude ?? null;
    data.privateLongitude = point?.longitude ?? null;
  }

  return Object.keys(data).length === 0 ? null : data;
}
