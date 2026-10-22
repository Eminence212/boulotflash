/**
 * Codes de statut anglais stockés en base (étape 05 / D08).
 * L’API n’accepte que ces codes — jamais les libellés français.
 */

export const USER_STATUSES = [
  'ACTIVE',
  'INCOMPLETE',
  'SUSPENDED',
  'CLOSED',
] as const;

export const JOB_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'PUBLISHED',
  'FILLED',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
  'REJECTED',
  'SUSPENDED',
] as const;

export const APPLICATION_STATUSES = [
  'SUBMITTED',
  'SHORTLISTED',
  'OFFERED',
  'ACCEPTED',
  'REJECTED',
  'DECLINED',
  'WITHDRAWN',
  'EXPIRED',
] as const;

export const SELECTION_OFFER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
] as const;

export const PARTICIPATION_STATUSES = [
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

export const PAYMENT_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'CONFIRMED',
  'REJECTED',
  'REFUNDED',
] as const;

export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'SUSPENDED', 'EXPIRED'] as const;

export type StatusEntity =
  | 'users'
  | 'jobs'
  | 'applications'
  | 'selection_offers'
  | 'participations'
  | 'payments'
  | 'subscriptions';

const BY_ENTITY: Record<StatusEntity, readonly string[]> = {
  users: USER_STATUSES,
  jobs: JOB_STATUSES,
  applications: APPLICATION_STATUSES,
  selection_offers: SELECTION_OFFER_STATUSES,
  participations: PARTICIPATION_STATUSES,
  payments: PAYMENT_STATUSES,
  subscriptions: SUBSCRIPTION_STATUSES,
};

export function isKnownStatus(entity: StatusEntity, code: string): boolean {
  return (BY_ENTITY[entity] as readonly string[]).includes(code);
}

/**
 * Refuse un code inconnu (ex. libellé FR « PRÉSÉLECTIONNÉE »).
 */
export function assertKnownStatus(entity: StatusEntity, code: string): void {
  if (!isKnownStatus(entity, code)) {
    throw new Error(
      `Statut inconnu pour ${entity}: ${JSON.stringify(code)}. Utilisez un code anglais du contrat.`,
    );
  }
}
