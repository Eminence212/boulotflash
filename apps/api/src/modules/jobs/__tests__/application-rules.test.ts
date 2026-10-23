import {
  ALREADY_APPLIED_MESSAGE,
  DAILY_LIMIT_MESSAGE,
  UNAVAILABLE_MESSAGE,
  alreadyAppliedBlock,
  applicationRequestHash,
  canWithdraw,
  countsTowardDailyLimit,
  dailyLimitReached,
  idempotencyDecision,
  isOwnJob,
  offerAcceptsApplications,
} from '../application-rules';

describe('candidature', () => {
  const now = new Date('2026-10-23T15:00:00.000Z');

  it('refuse une seconde candidature, même retirée', () => {
    expect(alreadyAppliedBlock('WITHDRAWN')).toEqual({
      code: 'ALREADY_APPLIED',
      message: ALREADY_APPLIED_MESSAGE,
    });
    expect(alreadyAppliedBlock('SUBMITTED')?.code).toBe('ALREADY_APPLIED');
    expect(alreadyAppliedBlock(null)).toBeNull();
  });

  it('compte les retraits des dernières 24 heures et ignore le reste', () => {
    expect(
      countsTowardDailyLimit(new Date('2026-10-23T14:00:00.000Z'), now),
    ).toBe(true);
    expect(
      countsTowardDailyLimit(new Date('2026-10-22T14:00:00.000Z'), now),
    ).toBe(false);
  });

  it('bloque à la cinquième candidature de la fenêtre', () => {
    expect(dailyLimitReached(5, 5)).toBe(true);
    expect(dailyLimitReached(4, 5)).toBe(false);
    expect(DAILY_LIMIT_MESSAGE).toBe('Vous avez atteint la limite du jour.');
  });

  it('refuse la propre offre et une offre non publiée', () => {
    expect(isOwnJob('user-1', 'user-1')).toBe(true);
    expect(isOwnJob('employer', 'worker')).toBe(false);
    expect(
      offerAcceptsApplications({
        status: 'IN_REVIEW',
        applyDeadline: new Date('2026-10-24T00:00:00.000Z'),
        placesRemaining: 2,
        now,
      }),
    ).toBe(false);
    expect(
      offerAcceptsApplications({
        status: 'PUBLISHED',
        applyDeadline: new Date('2026-10-23T14:00:00.000Z'),
        placesRemaining: 1,
        now,
      }),
    ).toBe(false);
  });

  it('rejoue la même clé et refuse un corps différent', () => {
    const hash = applicationRequestHash({
      availabilityConfirmed: true,
      message: 'Je peux venir.',
    });
    expect(idempotencyDecision(null, hash)).toBe('fresh');
    expect(idempotencyDecision(hash, hash)).toBe('replay');
    expect(
      idempotencyDecision(
        hash,
        applicationRequestHash({
          availabilityConfirmed: true,
          message: 'Autre message',
        }),
      ),
    ).toBe('conflict');
  });

  it('ne réautorise pas un retrait', () => {
    expect(canWithdraw('SUBMITTED')).toBe(true);
    expect(canWithdraw('SHORTLISTED')).toBe(true);
    expect(canWithdraw('WITHDRAWN')).toBe(false);
    expect(canWithdraw('OFFERED')).toBe(false);
    expect(alreadyAppliedBlock('WITHDRAWN')?.code).toBe('ALREADY_APPLIED');
    expect(UNAVAILABLE_MESSAGE).toContain('disponibilité');
  });
});
