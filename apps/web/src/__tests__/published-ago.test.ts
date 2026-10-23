import { detailViewLabel, formatPublishedAgo } from '../lib/published-ago';

const T0 = Date.parse('2026-10-23T12:00:00.000Z');

describe('formatPublishedAgo', () => {
  it('découpe secondes, minutes, heures et jours', () => {
    expect(formatPublishedAgo('2026-10-23T12:00:00.000Z', T0)).toBe('à l’instant');
    expect(formatPublishedAgo('2026-10-23T11:59:59.000Z', T0)).toBe('il y a 1 seconde');
    expect(formatPublishedAgo('2026-10-23T11:59:12.000Z', T0)).toBe('il y a 48 secondes');
    expect(formatPublishedAgo('2026-10-23T11:59:00.000Z', T0)).toBe('il y a 1 minute');
    expect(formatPublishedAgo('2026-10-23T11:17:00.000Z', T0)).toBe('il y a 43 minutes');
    expect(formatPublishedAgo('2026-10-23T11:00:00.000Z', T0)).toBe('il y a 1 heure');
    expect(formatPublishedAgo('2026-10-23T08:00:00.000Z', T0)).toBe('il y a 4 heures');
    expect(formatPublishedAgo('2026-10-22T12:00:00.000Z', T0)).toBe('il y a 1 jour');
    expect(formatPublishedAgo('2026-10-20T12:00:00.000Z', T0)).toBe('il y a 3 jours');
  });

  it('ignore une date illisible', () => {
    expect(formatPublishedAgo('pas-une-date', T0)).toBe('');
  });
});

describe('detailViewLabel', () => {
  it('accorde le nombre de visiteurs', () => {
    expect(detailViewLabel(0)).toBe('Aucune vue du détail');
    expect(detailViewLabel(1)).toBe('1 vue du détail');
    expect(detailViewLabel(12)).toBe('12 vues du détail');
  });
});
