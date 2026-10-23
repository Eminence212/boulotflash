import {
  formatDistanceKm,
  haversineKm,
  isInDrc,
} from '../user-location';

describe('position RDC', () => {
  it('accepte Kinshasa, Lubumbashi et Goma', () => {
    expect(isInDrc(-4.3217, 15.3126)).toBe(true);
    expect(isInDrc(-11.6642, 27.4826)).toBe(true);
    expect(isInDrc(-1.6585, 29.2205)).toBe(true);
  });

  it('refuse un point hors du pays', () => {
    expect(isInDrc(48.8566, 2.3522)).toBe(false);
  });
});

describe('haversine', () => {
  it('calcule environ 11,1 km entre 0,0 et 0,1', () => {
    expect(formatDistanceKm(haversineKm(0, 0, 0, 0.1))).toBe('11,1 km');
  });
});
