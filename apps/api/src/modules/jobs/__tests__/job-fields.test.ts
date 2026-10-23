import {
  JobValidationError,
  assertAmountPublishable,
  assertJobReadyToSubmit,
  assertTitlePublishable,
  contentFingerprint,
} from '../job-fields';

function expectValidation(fn: () => void, messageIncludes: string) {
  expect(fn).toThrow(JobValidationError);
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(JobValidationError);
    expect((err as JobValidationError).message).toContain(messageIncludes);
  }
}

describe('job-fields validations (étape 12)', () => {
  const baseNow = new Date('2026-10-23T10:00:00.000Z');
  const startAt = new Date('2026-10-25T10:00:00.000Z');
  const applyDeadline = new Date('2026-10-24T22:00:00.000Z');
  const selectionDeadline = new Date('2026-10-25T09:00:00.000Z');

  const valid = {
    title: 'Vente comptoir Gombe',
    description: 'Tenue de stand et encaissement simple.',
    categoryId: 'cat',
    communeId: 'com',
    startAt,
    durationHours: 4,
    workersNeeded: 2,
    amount: 1500,
    currency: 'USD',
    payUnit: 'MISSION',
    payChannel: 'CASH',
    applyDeadline,
    selectionDeadline,
  };

  it('refuse montant vide / titre « à discuter »', () => {
    expectValidation(
      () => assertAmountPublishable(0),
      'Indiquez le montant pour publier',
    );
    expectValidation(
      () => assertTitlePublishable('À discuter'),
      'Indiquez le montant pour publier',
    );
  });

  it('accepte un jeu de champs valide', () => {
    expect(() => assertJobReadyToSubmit(valid, baseNow)).not.toThrow();
  });

  it('refuse début hors fenêtre et places hors bornes', () => {
    expectValidation(
      () =>
        assertJobReadyToSubmit(
          { ...valid, startAt: new Date('2026-10-23T09:00:00.000Z') },
          baseNow,
        ),
      'futur',
    );
    expectValidation(
      () => assertJobReadyToSubmit({ ...valid, workersNeeded: 21 }, baseNow),
      'Places',
    );
  });

  it('refuse échéances incohérentes', () => {
    expectValidation(
      () =>
        assertJobReadyToSubmit(
          {
            ...valid,
            applyDeadline: selectionDeadline,
            selectionDeadline: applyDeadline,
          },
          baseNow,
        ),
      'candidature',
    );
  });

  it('fingerprint ignore casse et espaces périphériques', () => {
    expect(contentFingerprint('  Hello ', 'World')).toBe(
      contentFingerprint('hello', 'world'),
    );
  });
});
