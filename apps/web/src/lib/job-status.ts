import type { mantineStatusColors } from '@/theme/tokens';

type Tone = keyof typeof mantineStatusColors | 'soft';

const LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  IN_REVIEW: 'En modération',
  REJECTED: 'Rejetée',
  PUBLISHED: 'Publiée',
  FILLED: 'Pourvue',
  EXPIRED: 'Expirée',
  CANCELLED: 'Annulée',
  SUSPENDED: 'Suspendue',
  COMPLETED: 'Terminée',
};

const TONES: Record<string, Tone> = {
  DRAFT: 'soft',
  IN_REVIEW: 'attente',
  REJECTED: 'refus',
  PUBLISHED: 'succes',
  FILLED: 'succes',
  EXPIRED: 'alerte',
  CANCELLED: 'refus',
  SUSPENDED: 'refus',
  COMPLETED: 'succes',
};

export function jobStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}

export function jobStatusTone(status: string): Tone {
  return TONES[status] ?? 'soft';
}

/** Montant API (centimes) → chaîne formulaire. */
export function centsToMajor(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return '';
  return (cents / 100).toFixed(2).replace(/\.00$/, '');
}

/** Chaîne formulaire → centimes (entier). */
export function majorToCents(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function defaultMissionDates(from = new Date()): {
  startAt: string;
  applyDeadline: string;
  selectionDeadline: string;
} {
  const start = new Date(from.getTime() + 2 * 24 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  const apply = new Date(start.getTime() - 12 * 60 * 60 * 1000);
  const selection = new Date(start.getTime() - 60 * 60 * 1000);
  return {
    startAt: toDatetimeLocalValue(start.toISOString()),
    applyDeadline: toDatetimeLocalValue(apply.toISOString()),
    selectionDeadline: toDatetimeLocalValue(selection.toISOString()),
  };
}
