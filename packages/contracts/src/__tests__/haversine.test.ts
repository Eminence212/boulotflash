import { formatDistanceKm, haversineKm } from '../haversine';

describe('haversine', () => {
  it('calcule environ 11,1 km entre 0,0 et 0,1', () => {
    expect(formatDistanceKm(haversineKm(0, 0, 0, 0.1))).toBe('11,1 km');
  });

  it('arrondit au dixième de kilomètre', () => {
    expect(formatDistanceKm(0)).toBe('0,0 km');
    expect(formatDistanceKm(1.04)).toBe('1,0 km');
    expect(formatDistanceKm(1.06)).toBe('1,1 km');
  });
});
