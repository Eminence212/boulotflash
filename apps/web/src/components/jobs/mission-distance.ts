import { formatDistanceKm, haversineKm } from '@boulotflash/contracts';

export type LatLng = { latitude: number; longitude: number };

/**
 * Distance affichée sur le détail.
 * `origin` vient du navigateur, une seule fois, et n’est pas envoyé à l’API.
 */
export function distanceLabelFromFix(
  origin: LatLng | null,
  target: LatLng | null,
): string {
  if (!target) return 'distance indisponible';
  if (!origin) return 'position non partagée';
  return formatDistanceKm(
    haversineKm(
      origin.latitude,
      origin.longitude,
      target.latitude,
      target.longitude,
    ),
  );
}
