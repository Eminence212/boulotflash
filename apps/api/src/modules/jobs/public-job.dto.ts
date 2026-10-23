import { clientAvatarUrl } from '../identity/oauth-picture';

/**
 * DTO public d’une offre (étape 13) — allowlist stricte.
 * Toute clé hors de cette liste est une anomalie bloquante.
 */

export const PUBLIC_JOB_FORBIDDEN_KEYS = [
  'addressPrivate',
  'missionPhone',
  'privateLatitude',
  'privateLongitude',
  'employerId',
  'rejectionReason',
  'payChannel',
  'payTiming',
  'skillsRequired',
  'materialConditions',
  'address_private',
  'mission_phone',
  'private_latitude',
  'private_longitude',
] as const;

/** Auteur public d’une offre — jamais l’identifiant employeur brut. */
export type PublicPublisherDto = {
  name: string;
  avatarUrl: string | null;
  /** Null si le profil ne doit pas s’ouvrir (compte suspendu ou fermé). */
  profilePath: string | null;
};

export type PublicJobDto = {
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
  publicLatitude: number | null;
  publicLongitude: number | null;
  placesRemaining: number;
  featured: boolean;
  sharePath: string;
  applicationsOpen: boolean;
  publishedAt: string | null;
  detailViewCount: number;
  publisher: PublicPublisherDto;
};

/** Détail public : champs liste + statut / description / message clôture. */
export type PublicJobDetailDto = PublicJobDto & {
  description: string;
  status: string;
  workersNeeded: number;
  closedMessage: string | null;
  /** Placeholder étape 14 — jamais une vraie distance ici. */
  distanceLabel: string;
};

export function sharePathFor(jobId: string): string {
  return `/missions/${jobId}`;
}

export function publisherProfilePath(userId: string): string {
  return `/recruteurs/${userId}`;
}

const PUBLIC_PROFILE_STATUSES = new Set(['ACTIVE', 'INCOMPLETE']);

export function toPublicPublisher(input: {
  userId: string;
  userDisplayName: string | null;
  avatarUrl: string | null;
  employerDisplayName: string | null;
  accountStatus: string;
}): PublicPublisherDto {
  const name =
    (input.employerDisplayName || input.userDisplayName || '').trim() ||
    'Recruteur';
  return {
    name,
    avatarUrl: clientAvatarUrl(input.userId, input.avatarUrl),
    profilePath: PUBLIC_PROFILE_STATUSES.has(input.accountStatus)
      ? publisherProfilePath(input.userId)
      : null,
  };
}

export function assertNoForbiddenPublicKeys(
  payload: Record<string, unknown>,
): void {
  for (const key of PUBLIC_JOB_FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      throw new Error(`Clé publique interdite : ${key}`);
    }
  }
}

export function toPublicJobDto(input: {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  payUnit: string;
  startAt: Date | string;
  durationHours: number;
  commune: string;
  publicLandmark: string | null;
  publicLatitude: number | null;
  publicLongitude: number | null;
  placesRemaining: number;
  featured: boolean;
  applicationsOpen: boolean;
  publishedAt: Date | string | null;
  detailViewCount: number;
  publisher: PublicPublisherDto;
  /** Si false, lat/lng absents (offre close). */
  includeCoords?: boolean;
}): PublicJobDto {
  const includeCoords = input.includeCoords !== false;
  const dto: PublicJobDto = {
    id: input.id,
    title: input.title,
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    payUnit: input.payUnit,
    startAt:
      input.startAt instanceof Date
        ? input.startAt.toISOString()
        : input.startAt,
    durationHours: input.durationHours,
    commune: input.commune,
    publicLandmark: input.publicLandmark,
    publicLatitude: includeCoords ? input.publicLatitude : null,
    publicLongitude: includeCoords ? input.publicLongitude : null,
    placesRemaining: input.placesRemaining,
    featured: input.featured,
    sharePath: sharePathFor(input.id),
    applicationsOpen: input.applicationsOpen,
    publishedAt:
      input.publishedAt instanceof Date
        ? input.publishedAt.toISOString()
        : input.publishedAt,
    detailViewCount: input.detailViewCount,
    publisher: {
      name: input.publisher.name,
      avatarUrl: input.publisher.avatarUrl,
      profilePath: input.publisher.profilePath,
    },
  };
  assertNoForbiddenPublicKeys(dto as unknown as Record<string, unknown>);
  assertNoForbiddenPublicKeys(
    dto.publisher as unknown as Record<string, unknown>,
  );
  return dto;
}

const CLOSED_STATUSES = new Set([
  'FILLED',
  'EXPIRED',
  'CANCELLED',
  'COMPLETED',
]);

export function closedMessageFor(status: string): string | null {
  if (!CLOSED_STATUSES.has(status)) return null;
  return 'Cette mission n’accepte plus de candidature';
}

export function isPubliclyVisibleStatus(status: string): boolean {
  return (
    status === 'PUBLISHED' ||
    status === 'FILLED' ||
    status === 'EXPIRED' ||
    status === 'CANCELLED' ||
    status === 'COMPLETED'
  );
}

export function isShareableStatus(status: string): boolean {
  return isPubliclyVisibleStatus(status);
}
