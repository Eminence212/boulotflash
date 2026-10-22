/**
 * Couleurs de statut — source unique tokens.json (étape 02 / 04).
 * Le thème Mantine et Tailwind doivent exposer les mêmes hex.
 */

export type StatusKey = 'attente' | 'succes' | 'refus' | 'alerte';

export type StatusColor = {
  fg: string;
  bg: string;
  label: string;
};

/** Hex issus de design/tokens/tokens.json — ne pas diverger. */
export const STATUS_COLORS: Record<StatusKey, StatusColor> = {
  attente: { fg: '#9A6700', bg: '#FFF3CD', label: 'En attente' },
  succes: { fg: '#0F7B3A', bg: '#D8F3E3', label: 'Confirmé' },
  refus: { fg: '#B42318', bg: '#FEE4E2', label: 'Refusé' },
  alerte: { fg: '#B54708', bg: '#FEF0C7', label: 'À traiter' },
};

export const BRAND_FLASH = '#3EA4FF';
export const SURFACE_CANVAS = '#F0F5FA';
