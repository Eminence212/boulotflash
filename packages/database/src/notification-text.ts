/**
 * Textes des notifications in-app (étape 18, CDC §8.3).
 * Deux phrases : les faits publics de la mission (titre, heure de Kinshasa, commune, rémunération),
 * puis l’action attendue. Jamais de numéro ni d’adresse exacte.
 */

const KINSHASA = 'Africa/Kinshasa';

export type AvailabilitySlotName = 'MORNING' | 'AFTERNOON' | 'EVENING';

/** Jour ISO (lundi = 1 … dimanche = 7) et créneau de l’heure de début, à Kinshasa. */
export function kinshasaWeekdaySlot(at: Date): { weekday: number; slot: AvailabilitySlotName } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: KINSHASA,
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const day = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day) + 1;
  // Matin avant 12 h, après-midi de 12 h à avant 18 h, soir à partir de 18 h.
  const slot: AvailabilitySlotName = hour < 12 ? 'MORNING' : hour < 18 ? 'AFTERNOON' : 'EVENING';
  return { weekday, slot };
}

/** « sam. 31 oct., 18 h » ou « sam. 31 oct., 18 h 30 », heure de Kinshasa. */
export function kinshasaWhen(at: Date): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: KINSHASA,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = String(Number(get('hour')));
  const minute = get('minute');
  return `${get('weekday')} ${get('day')} ${get('month')}, ${hour} h${minute === '00' ? '' : ` ${minute}`}`;
}

/** « 15 USD la mission » (montants stockés en centimes). */
export function payLabel(amountCents: number, currency: string, payUnit: string): string {
  const major = amountCents / 100;
  const amount = Number.isInteger(major)
    ? String(major)
    : major.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const unit = payUnit === 'HOUR' ? 'de l’heure' : payUnit === 'DAY' ? 'la journée' : 'la mission';
  return `${amount} ${currency === 'USD' ? 'USD' : 'CDF'} ${unit}`;
}

export type JobFacts = {
  title: string;
  startAt: Date;
  commune: string;
  amount: number;
  currency: string;
  payUnit: string;
};

/** « « Service soirée », sam. 31 oct., 18 h, Gombe » : repères publics, sans le montant. */
export function jobPlace(job: Pick<JobFacts, 'title' | 'startAt' | 'commune'>): string {
  return `« ${job.title} », ${kinshasaWhen(job.startAt)}, ${job.commune}`;
}

/** Repères publics avec la rémunération, comme dans les exemples du CDC. */
export function jobFacts(job: JobFacts): string {
  return `${jobPlace(job)}, ${payLabel(job.amount, job.currency, job.payUnit)}`;
}
