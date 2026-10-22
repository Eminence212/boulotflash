/**
 * Libellés français d’interface (CDC §9). Jamais persistés en base.
 */

import type { StatusEntity } from './statuses';

/** Table de correspondance code anglais → libellé FR. */
export const STATUS_LABELS_FR: Record<string, string> = {
  ACTIVE: 'Actif',
  INCOMPLETE: 'Incomplet',
  SUSPENDED: 'Suspendu',
  CLOSED: 'Fermé',
  DRAFT: 'Brouillon',
  IN_REVIEW: 'En modération',
  PUBLISHED: 'Publiée',
  FILLED: 'Pourvue',
  COMPLETED: 'Terminée',
  EXPIRED: 'Expirée',
  CANCELLED: 'Annulée',
  REJECTED: 'Rejetée',
  SUBMITTED: 'Soumise',
  SHORTLISTED: 'Présélectionnée',
  OFFERED: 'Sélection proposée',
  ACCEPTED: 'Acceptée',
  DECLINED: 'Déclinée',
  WITHDRAWN: 'Retirée',
  CONFIRMED: 'Confirmée',
  NO_SHOW: 'Absence',
  PENDING: 'En attente',
  UNDER_REVIEW: 'En vérification',
  REFUNDED: 'Remboursé',
};

/**
 * Codes français accentués — interdits comme valeur de colonne.
 * Présents ici uniquement pour documenter le refus (D08).
 */
export const FORBIDDEN_STORED_FR_CODES = [
  'PRÉSÉLECTIONNÉE',
  'EN_MODÉRATION',
  'PUBLIÉE',
  'POURVUE',
  'DÉSACCORD',
] as const;

export function labelFr(code: string): string {
  const label = STATUS_LABELS_FR[code];
  if (!label) {
    throw new Error(`Libellé FR manquant pour le code ${JSON.stringify(code)}`);
  }
  return label;
}

export function labelFrFor(_entity: StatusEntity, code: string): string {
  return labelFr(code);
}
