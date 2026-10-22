import {
  assertKnownStatus,
  FORBIDDEN_STORED_FR_CODES,
  labelFr,
  STATUS_LABELS_FR,
} from '../index';

describe('statuts et libellés FR (étape 05 / D08)', () => {
  it('OFFERED = Sélection proposée', () => {
    expect(STATUS_LABELS_FR.OFFERED).toBe('Sélection proposée');
    expect(labelFr('OFFERED')).toBe('Sélection proposée');
  });

  it('refuse PRÉSÉLECTIONNÉE comme code stocké', () => {
    expect(FORBIDDEN_STORED_FR_CODES).toContain('PRÉSÉLECTIONNÉE');
    expect(() =>
      assertKnownStatus('applications', 'PRÉSÉLECTIONNÉE'),
    ).toThrow(/Statut inconnu/);
  });

  it('accepte SHORTLISTED (code anglais)', () => {
    expect(() =>
      assertKnownStatus('applications', 'SHORTLISTED'),
    ).not.toThrow();
  });
});
