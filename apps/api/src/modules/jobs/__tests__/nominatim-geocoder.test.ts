import {
  memoryCache,
  parseNominatimBody,
  resolveJobCoords,
} from '../nominatim-search';

const place = 'Gombe, Kinshasa, République démocratique du Congo';

describe('géocodage Nominatim', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env.NOMINATIM_USER_AGENT = env.NOMINATIM_USER_AGENT;
    process.env.NOMINATIM_ADAPTER = env.NOMINATIM_ADAPTER;
    process.env.APP_ENV = env.APP_ENV;
  });

  it('n’appelle pas Nominatim et n’écrit rien sans identifiant', async () => {
    delete process.env.NOMINATIM_USER_AGENT;
    const fetchImpl = jest.fn();
    const data = await resolveJobCoords({
      userAgent: '',
      landmark: 'près du marché',
      address: '10 avenue de test, Gombe',
      place,
      cache: memoryCache(),
      fetchImpl: fetchImpl as never,
    });
    expect(data).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('enregistre la fixture publique et un point privé différent, sans réseau', async () => {
    process.env.NOMINATIM_ADAPTER = 'simulated';
    const fetchImpl = jest.fn();
    const data = await resolveJobCoords({
      userAgent: 'BoulotFlash local fixture',
      landmark: 'près du marché',
      address: '10 avenue de test, Gombe',
      place,
      cache: memoryCache(),
      fetchImpl: fetchImpl as never,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(data).toEqual({
      publicLatitude: -4.305,
      publicLongitude: 15.291,
      privateLatitude: -4.3275,
      privateLongitude: 15.318,
    });
  });

  it('laisse les coordonnées vides pour un repère hors fixture', async () => {
    process.env.NOMINATIM_ADAPTER = 'simulated';
    const data = await resolveJobCoords({
      userAgent: 'BoulotFlash local fixture',
      landmark: 'place inconnue',
      address: null,
      place,
      cache: memoryCache(),
      fetchImpl: jest.fn() as never,
    });
    expect(data).toEqual({ publicLatitude: null, publicLongitude: null });
  });

  it('met en cache cinq minutes : un seul appel pour le même repère', async () => {
    process.env.NOMINATIM_ADAPTER = 'live';
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [{ lat: '-4.3100', lon: '15.3000' }],
    }));
    const cache = memoryCache();
    const input = {
      userAgent: 'BoulotFlash test',
      landmark: 'près du marché',
      address: '10 avenue de test, Gombe',
      place,
      cache,
      fetchImpl: fetchImpl as never,
    };
    await resolveJobCoords(input);
    await resolveJobCoords(input);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const first = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((first[1].headers as Record<string, string>)['User-Agent']).toBe(
      'BoulotFlash test',
    );
  });

  it('écarte un point hors RDC', () => {
    expect(parseNominatimBody([{ lat: '48.85', lon: '2.35' }])).toBeNull();
    expect(parseNominatimBody([{ lat: '-4.31', lon: '15.30' }])).toEqual({
      latitude: -4.31,
      longitude: 15.3,
    });
  });
});
