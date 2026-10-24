/** Types partagés session `/me` (étape 11). */

export type MeAvailability = { weekday: number; slot: string };

export type MeWorkerProfile = {
  id: string;
  displayName: string;
  communeId: string | null;
  mainCategoryId: string | null;
  bio: string | null;
  isAvailable: boolean;
  commune?: { id: string; name: string } | null;
  mainCategory?: { id: string; name: string; slug: string } | null;
  skills?: Array<{
    category: { id: string; name: string; slug: string };
  }>;
  availability: MeAvailability[];
};

export type MeEmployerProfile = {
  id: string;
  type: string;
  displayName: string;
  contactPerson: string | null;
  communeId: string | null;
  presentation: string | null;
  commune?: { id: string; name: string } | null;
};

export type MeSubscription = {
  status: string;
  endsAt: string | null;
  startedAt?: string;
  label: string;
};

export type MeResponse = {
  id: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** Vrai seulement si la personne a accepté d’enregistrer sa position actuelle. */
  locationShared?: boolean;
  status: string;
  phoneConfirmedAt?: string | null;
  activeMode?: 'WORKER' | 'EMPLOYER' | string | null;
  roles: string[];
  modesAvailable: {
    worker: boolean;
    employer: boolean;
    canSwitch: boolean;
  };
  workerProfile: MeWorkerProfile | null;
  employerProfile: MeEmployerProfile | null;
  subscription: MeSubscription | null;
  gaps: string[];
  workerProfileComplete: boolean;
  needsProfileCompletion: boolean;
  phoneBadge: boolean;
  missing?: {
    phone?: boolean;
    displayName?: boolean;
    workerCommune?: boolean;
    workerCategory?: boolean;
    workerAvailability?: boolean;
  };
  code?: string;
  message?: string;
};

export type PublicPublisher = {
  name: string;
  avatarUrl: string | null;
  profilePath: string | null;
};

export type PublicJob = {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  payUnit: string;
  startAt: string;
  durationHours: number;
  commune: string;
  publicLandmark: string | null;
  publicLatitude?: number | null;
  publicLongitude?: number | null;
  placesRemaining: number;
  featured: boolean;
  sharePath?: string;
  applicationsOpen: boolean;
  status?: string;
  description?: string;
  closedMessage?: string | null;
  distanceLabel?: string;
  workersNeeded?: number;
  publishedAt?: string | null;
  detailViewCount?: number;
  publisher?: PublicPublisher;
};

export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
};

export const SLOT_LABELS: Record<string, string> = {
  MORNING: 'matin',
  AFTERNOON: 'après-midi',
  EVENING: 'soir',
};

const SLOT_ORDER = ['MORNING', 'AFTERNOON', 'EVENING'];

/** « Lun. matin, Mar. soir » : disponibilités lisibles d’un coup d’œil. */
export function formatAvailability(slots: { weekday: number; slot: string }[]): string {
  if (slots.length === 0) return 'Aucun créneau indiqué';
  return [...slots]
    .sort((a, b) => a.weekday - b.weekday || SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
    .map((s) => `${(WEEKDAY_LABELS[s.weekday] ?? '').slice(0, 3)}. ${SLOT_LABELS[s.slot] ?? s.slot}`)
    .join(', ');
}

/** « dans 1 h 45 », « dans 12 min », ou null si l’échéance est passée. */
export function timeLeftLabel(iso: string, now = Date.now()): string | null {
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `dans ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `dans ${hours} h ${String(rest).padStart(2, '0')}` : `dans ${hours} h`;
  const days = Math.floor(hours / 24);
  return `dans ${days} jour${days > 1 ? 's' : ''}`;
}

export const EMPLOYER_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Particulier',
  BUSINESS: 'Entreprise',
  ARTISAN: 'Artisan',
  ORGANIZATION: 'Organisation',
};

export function isEmployerMode(me: MeResponse | null): boolean {
  if (!me) return false;
  if (me.activeMode === 'EMPLOYER') return true;
  if (me.activeMode === 'WORKER') return false;
  return me.modesAvailable.employer && !me.modesAvailable.worker;
}

/** `amount` API = centimes (1500 → 15 USD). */
export function formatMoney(amountCents: number, currency: string): string {
  const major = amountCents / 100;
  const label =
    major % 1 === 0
      ? String(Math.round(major))
      : major.toLocaleString('fr-FR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
  if (currency === 'USD') return `${label} USD`;
  return `${label} CDF`;
}

/** Complète le montant : « 15 USD la mission », « 5 USD de l’heure ». */
export function payUnitLabel(unit: string): string {
  if (unit === 'HOUR') return 'de l’heure';
  if (unit === 'DAY') return 'la journée';
  return 'la mission';
}

export function formatStartAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Kinshasa',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
