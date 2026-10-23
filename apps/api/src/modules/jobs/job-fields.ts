export type JobPayUnit = 'HOUR' | 'DAY' | 'MISSION';
export type JobCurrency = 'CDF' | 'USD';
export type JobPayChannel = 'CASH' | 'MOBILE_MONEY';

/** Corps de création / mise à jour brouillon (champs partiels OK hors submit). */
export type JobDraftInput = {
  title?: string;
  description?: string;
  categoryId?: string;
  communeId?: string;
  publicLandmark?: string | null;
  publicLatitude?: number | null;
  publicLongitude?: number | null;
  addressPrivate?: string | null;
  privateLatitude?: number | null;
  privateLongitude?: number | null;
  missionPhone?: string | null;
  atPrivateHome?: boolean;
  startAt?: string;
  durationHours?: number;
  workersNeeded?: number;
  /** Montant en centimes (1500 = 15,00). */
  amount?: number;
  currency?: JobCurrency;
  payUnit?: JobPayUnit;
  payChannel?: JobPayChannel;
  payTiming?: string | null;
  skillsRequired?: string | null;
  materialConditions?: string | null;
  transportSupport?: boolean;
  mealsSupport?: boolean;
  equipmentSupport?: boolean;
  applyDeadline?: string;
  selectionDeadline?: string;
};

/** Erreur de validation métier — convertie en HttpException côté service. */
export class JobValidationError extends Error {
  readonly code = 'VALIDATION' as const;

  constructor(message: string) {
    super(message);
    this.name = 'JobValidationError';
  }
}

const DISCUSS_RE =
  /\b(à\s*discuter|a\s*discuter|negociable|négociable|selon\s*accord)\b/i;

export function assertAmountPublishable(amount: number | null | undefined): void {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    throw new JobValidationError('Indiquez le montant pour publier.');
  }
}

export function assertTitlePublishable(title: string): void {
  const t = title.trim();
  if (t.length < 3) {
    throw new JobValidationError('Indiquez un titre pour publier.');
  }
  if (DISCUSS_RE.test(t) || /^à\s*discuter$/i.test(t)) {
    throw new JobValidationError('Indiquez le montant pour publier.');
  }
}

export function parseDate(value: string | undefined, label: string): Date {
  if (!value) {
    throw new JobValidationError(`${label} requis.`);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new JobValidationError(`${label} invalide.`);
  }
  return d;
}

/**
 * Validations strictes avant soumission (étape 12).
 * `now` injectable pour les tests d’horloge.
 */
export function assertJobReadyToSubmit(
  input: {
    title: string;
    description: string;
    categoryId: string;
    communeId: string;
    startAt: Date;
    durationHours: number;
    workersNeeded: number;
    amount: number;
    currency: string;
    payUnit: string;
    payChannel: string;
    applyDeadline: Date;
    selectionDeadline: Date;
  },
  now: Date = new Date(),
): void {
  assertTitlePublishable(input.title);
  if (input.description.trim().length < 10) {
    throw new JobValidationError(
      'Décrivez la mission (au moins 10 caractères).',
    );
  }
  assertAmountPublishable(input.amount);
  if (input.currency !== 'CDF' && input.currency !== 'USD') {
    throw new JobValidationError('Devise CDF ou USD uniquement.');
  }
  if (!['HOUR', 'DAY', 'MISSION'].includes(input.payUnit)) {
    throw new JobValidationError(
      'Base de rémunération : heure, journée ou mission.',
    );
  }
  if (!['CASH', 'MOBILE_MONEY'].includes(input.payChannel)) {
    throw new JobValidationError('Canal de paiement invalide.');
  }

  const maxStart = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (input.startAt <= now) {
    throw new JobValidationError(
      'Le début de mission doit être dans le futur.',
    );
  }
  if (input.startAt > maxStart) {
    throw new JobValidationError(
      'Le début de mission doit être dans les 30 prochains jours.',
    );
  }

  if (
    !Number.isFinite(input.durationHours) ||
    input.durationHours < 1 ||
    input.durationHours > 14 * 24
  ) {
    throw new JobValidationError('Durée entre 1 heure et 14 jours.');
  }

  if (
    !Number.isInteger(input.workersNeeded) ||
    input.workersNeeded < 1 ||
    input.workersNeeded > 20
  ) {
    throw new JobValidationError('Places : entre 1 et 20.');
  }

  if (input.applyDeadline >= input.selectionDeadline) {
    throw new JobValidationError(
      'La date limite de candidature doit être avant la clôture des sélections.',
    );
  }
  if (input.selectionDeadline > input.startAt) {
    throw new JobValidationError(
      'La clôture des sélections doit être avant ou égale au début de mission.',
    );
  }
}

export function contentFingerprint(title: string, description: string): string {
  return `${title.trim().toLowerCase()}\n${description.trim().toLowerCase()}`;
}

/** Champs dont le changement crée une nouvelle version (BF-J-08). */
export const SUBSTANTIAL_KEYS = [
  'amount',
  'currency',
  'payUnit',
  'startAt',
  'durationHours',
  'communeId',
  'publicLandmark',
  'publicLatitude',
  'publicLongitude',
  'addressPrivate',
  'privateLatitude',
  'privateLongitude',
  'atPrivateHome',
  'description',
  'skillsRequired',
  'materialConditions',
  'transportSupport',
  'mealsSupport',
  'equipmentSupport',
  'workersNeeded',
  'title',
] as const;

export function jobSnapshot(job: Record<string, unknown>): Record<string, unknown> {
  const keys = [
    'title',
    'description',
    'categoryId',
    'communeId',
    'publicLandmark',
    'publicLatitude',
    'publicLongitude',
    'addressPrivate',
    'privateLatitude',
    'privateLongitude',
    'missionPhone',
    'atPrivateHome',
    'startAt',
    'durationHours',
    'workersNeeded',
    'amount',
    'currency',
    'payUnit',
    'payChannel',
    'payTiming',
    'skillsRequired',
    'materialConditions',
    'transportSupport',
    'mealsSupport',
    'equipmentSupport',
    'applyDeadline',
    'selectionDeadline',
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = job[k];
    out[k] =
      v instanceof Date ? v.toISOString() : v === undefined ? null : v;
  }
  return out;
}
