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
