/**
 * Étape 18 — filtre de correspondance : commune, compétence, créneau, auteur, profil incomplet,
 * disponibilité coupée, compte inactif. Créneaux lus à l’heure de Kinshasa (UTC+1, sans heure d’été).
 */
import { matchMismatch, profileMatchesJob, type MatchCandidate, type MatchJob } from '../matching';
import { jobFacts, kinshasaWeekdaySlot, kinshasaWhen } from '../notification-text';
import { startsInLabel } from '../reminders';

const LEMBA = 'commune-lemba';
const VENTE = 'cat-vente';

// Samedi 31 octobre 2026, 19:00 à Kinshasa = 18:00 UTC.
const SAT_19H = new Date('2026-10-31T18:00:00Z');

const job: MatchJob = { employerId: 'recruteur', categoryId: VENTE, communeId: LEMBA, startAt: SAT_19H };

function candidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    userId: 'grace',
    userStatus: 'ACTIVE',
    isAvailable: true,
    displayName: 'Grâce',
    communeId: LEMBA,
    mainCategoryId: VENTE,
    skillCategoryIds: [],
    availability: [{ weekday: 6, slot: 'EVENING' }],
    ...overrides,
  };
}

describe('créneau de Kinshasa', () => {
  it('lit le jour ISO et le créneau sur l’heure locale', () => {
    expect(kinshasaWeekdaySlot(SAT_19H)).toEqual({ weekday: 6, slot: 'EVENING' });
    // 11:59 locale = matin ; 12:00 = après-midi ; 17:59 = après-midi ; 18:00 = soir.
    expect(kinshasaWeekdaySlot(new Date('2026-10-31T10:59:00Z')).slot).toBe('MORNING');
    expect(kinshasaWeekdaySlot(new Date('2026-10-31T11:00:00Z')).slot).toBe('AFTERNOON');
    expect(kinshasaWeekdaySlot(new Date('2026-10-31T16:59:00Z')).slot).toBe('AFTERNOON');
    expect(kinshasaWeekdaySlot(new Date('2026-10-31T17:00:00Z')).slot).toBe('EVENING');
  });

  it('change de jour à minuit locale, pas à minuit UTC', () => {
    // Dimanche 1er novembre 00:30 à Kinshasa = samedi 23:30 UTC.
    expect(kinshasaWeekdaySlot(new Date('2026-10-31T23:30:00Z'))).toEqual({ weekday: 7, slot: 'MORNING' });
  });
});

describe('filtre de correspondance', () => {
  it('profil complet, même commune, compétence principale, créneau couvert : correspond', () => {
    expect(profileMatchesJob(candidate(), job)).toBe(true);
  });

  it('une compétence secondaire suffit', () => {
    expect(matchMismatch(candidate({ mainCategoryId: 'cat-menage', skillCategoryIds: [VENTE] }), job)).toBeNull();
  });

  it.each<[string, Partial<MatchCandidate>, string]>([
    ['autre commune', { communeId: 'commune-gombe' }, 'commune'],
    ['autre compétence', { mainCategoryId: 'cat-menage' }, 'competence'],
    ['disponibilité coupée', { isAvailable: false }, 'indisponible'],
    ['profil sans commune ni compétence', { communeId: null, mainCategoryId: null }, 'incomplet'],
    ['profil sans disponibilités', { availability: [] }, 'incomplet'],
    ['nom trop court', { displayName: 'G' }, 'incomplet'],
    ['compte suspendu', { userStatus: 'SUSPENDED' }, 'compte'],
    ['compte incomplet', { userStatus: 'INCOMPLETE' }, 'compte'],
    ['bon jour, mauvais créneau', { availability: [{ weekday: 6, slot: 'MORNING' }] }, 'creneau'],
    ['bon créneau, mauvais jour', { availability: [{ weekday: 5, slot: 'EVENING' }] }, 'creneau'],
  ])('%s : pas d’alerte', (_label, overrides, reason) => {
    expect(matchMismatch(candidate(overrides), job)).toBe(reason);
  });

  it('l’auteur de l’offre ne reçoit jamais l’alerte, même avec un profil identique', () => {
    expect(matchMismatch(candidate({ userId: 'recruteur' }), job)).toBe('auteur');
  });

  it('offre à 10:00, candidat seulement le soir : rien ; offre à 19:00 : alerte', () => {
    const morning = { ...job, startAt: new Date('2026-10-31T09:00:00Z') };
    expect(profileMatchesJob(candidate(), morning)).toBe(false);
    expect(profileMatchesJob(candidate(), job)).toBe(true);
  });
});

describe('texte', () => {
  it('heure de Kinshasa, commune et rémunération, sans adresse', () => {
    expect(kinshasaWhen(SAT_19H)).toBe('sam. 31 oct., 19 h');
    expect(kinshasaWhen(new Date('2026-10-31T17:30:00Z'))).toBe('sam. 31 oct., 18 h 30');
    expect(
      jobFacts({ title: 'Service soirée', startAt: SAT_19H, commune: 'Lemba', amount: 1500, currency: 'USD', payUnit: 'MISSION' }),
    ).toBe('« Service soirée », sam. 31 oct., 19 h, Lemba, 15 USD la mission');
  });
});

describe('délai du rappel', () => {
  it('heures, heures et minutes, minutes', () => {
    expect(startsInLabel(3 * 3600_000)).toBe('3 h');
    expect(startsInLabel(3 * 3600_000 - 60_000)).toBe('2 h 59');
    expect(startsInLabel(2 * 3600_000 + 3 * 60_000)).toBe('2 h');
    expect(startsInLabel(45 * 60_000)).toBe('45 min');
    expect(startsInLabel(10_000)).toBe('1 min');
  });
});
