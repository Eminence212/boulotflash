/** Rectangle de la RDC, un peu élargi pour les villes frontalières. Pas Kinshasa seul. */
export const DRC_BOUNDS = {
  minLat: -13.5,
  maxLat: 5.5,
  minLng: 12,
  maxLng: 31.5,
} as const;

export function isInDrc(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= DRC_BOUNDS.minLat &&
    latitude <= DRC_BOUNDS.maxLat &&
    longitude >= DRC_BOUNDS.minLng &&
    longitude <= DRC_BOUNDS.maxLng
  );
}

/** ~11 m : assez pour une distance au dixième de kilomètre. */
export function roundCoord(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export { formatDistanceKm, haversineKm } from '@boulotflash/contracts';
