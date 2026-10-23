import { markerPosition, tileLayerFor } from '../public-map';
import { distanceLabelFromFix } from '../mission-distance';

describe('carte publique', () => {
  it('place le marqueur sur le point public, pas sur le privé', () => {
    const point = markerPosition({
      publicLatitude: -4.305,
      publicLongitude: 15.291,
      privateLatitude: -4.3275,
      privateLongitude: 15.318,
    });
    expect(point).toEqual({ latitude: -4.305, longitude: 15.291 });
    expect(point?.latitude).not.toBe(-4.3275);
    expect(point?.longitude).not.toBe(15.318);
  });

  it('n’invente pas de marqueur sans point public', () => {
    expect(
      markerPosition({
        publicLatitude: null,
        publicLongitude: null,
        privateLatitude: -4.3275,
        privateLongitude: 15.318,
      }),
    ).toBeNull();
  });

  it('utilise OpenStreetMap sans clé MapTiler', () => {
    const tiles = tileLayerFor(undefined);
    expect(tiles.url).toContain('tile.openstreetmap.org');
    expect(tiles.url).not.toContain('maptiler');
    expect(tiles.url).not.toContain('-4.3275');
    expect(tileLayerFor('').url).toContain('tile.openstreetmap.org');
  });

  it('utilise MapTiler quand une clé est fournie', () => {
    const tiles = tileLayerFor('cle-de-test');
    expect(tiles.url).toContain('api.maptiler.com');
    expect(tiles.url).toContain('key=cle-de-test');
    expect(tiles.url).not.toContain('-4.3275');
  });
});

describe('distance locale', () => {
  it('reste indisponible sans point public', () => {
    expect(
      distanceLabelFromFix({ latitude: -4.32, longitude: 15.3 }, null),
    ).toBe('distance indisponible');
  });

  it('indique une position non partagée sans origine', () => {
    expect(
      distanceLabelFromFix(null, { latitude: -4.305, longitude: 15.291 }),
    ).toBe('position non partagée');
  });

  it('arrondit la distance au dixième sans quitter le navigateur', () => {
    expect(
      distanceLabelFromFix(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 0.1 },
      ),
    ).toBe('11,1 km');
  });
});
