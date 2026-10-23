const EARTH_KM = 6371;

/** Distance à vol d’oiseau, en kilomètres. Rayon terrestre 6371 km. */
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

/** Arrondi au dixième de kilomètre, virgule française. */
export function formatDistanceKm(km: number): string {
  const rounded = Math.round(km * 10) / 10;
  return `${rounded.toFixed(1).replace('.', ',')} km`;
}
