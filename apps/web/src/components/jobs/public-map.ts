export type PublicMapInput = {
  publicLatitude?: number | null;
  publicLongitude?: number | null;
  /** Présents seulement pour prouver qu’ils ne deviennent pas le marqueur. */
  privateLatitude?: number | null;
  privateLongitude?: number | null;
};

/** Marqueur : uniquement le point public. */
export function markerPosition(
  input: PublicMapInput,
): { latitude: number; longitude: number } | null {
  const latitude = input.publicLatitude;
  const longitude = input.publicLongitude;
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }
  return { latitude, longitude };
}

/** Tuiles OSM par défaut. MapTiler seulement si une clé est fournie. */
export function tileLayerFor(apiKey: string | undefined): {
  url: string;
  attribution: string;
} {
  const key = apiKey?.trim();
  if (key) {
    return {
      url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
      attribution: '© MapTiler © OpenStreetMap',
    };
  }
  return {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
  };
}
