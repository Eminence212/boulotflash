import { canRetry, geolocationFailure, geolocationFailureMessage } from '@/lib/geolocation';

describe('échec de géolocalisation', () => {
  it('classe les codes du navigateur', () => {
    expect(geolocationFailure({ code: 1 })).toBe('denied');
    expect(geolocationFailure({ code: 2 })).toBe('unavailable');
    expect(geolocationFailure({ code: 3 })).toBe('timeout');
    expect(geolocationFailure(new Error('unsupported'))).toBe('unsupported');
  });

  it('propose un nouvel essai seulement quand il peut réussir', () => {
    expect(canRetry('unavailable')).toBe(true);
    expect(canRetry('timeout')).toBe(true);
    expect(canRetry('denied')).toBe(false);
    expect(canRetry('unsupported')).toBe(false);
  });

  it('ne dit plus « non partagée » quand la position est seulement introuvable', () => {
    expect(geolocationFailureMessage('unavailable')).toMatch(/introuvable/);
    expect(geolocationFailureMessage('unavailable')).not.toMatch(/non partagée/);
    expect(geolocationFailureMessage('denied')).toMatch(/refusée/);
  });
});
