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

const EARTH_KM = 6371;

/** Distance à vol d’oiseau, kilomètres. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Arrondi au dixième, virgule française. */
export function formatDistanceKm(km: number): string {
  const rounded = Math.round(km * 10) / 10;
  return `${rounded.toFixed(1).replace('.', ',')} km`;
}
