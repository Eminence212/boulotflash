/**
 * Réponses figées du géocodeur local (jeu d’essai).
 * Ce ne sont pas des centres de commune et aucune source officielle
 * n’est citée ici : voir docs/implementation/COMMUNES_SOURCE.md.
 */
export const SIMULATED_PUBLIC_LANDMARK = {
  match: 'pres du marche',
  latitude: -4.305,
  longitude: 15.291,
} as const;

export const SIMULATED_PRIVATE_ADDRESS = {
  match: '10 avenue de test',
  latitude: -4.3275,
  longitude: 15.318,
} as const;

function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Point simulé pour un repère connu du jeu d’essai. Sinon null. */
export function simulatedGeocode(
  query: string,
  kind: 'public' | 'private',
): { latitude: number; longitude: number } | null {
  const q = fold(query);
  if (kind === 'public' && q.includes(SIMULATED_PUBLIC_LANDMARK.match)) {
    return {
      latitude: SIMULATED_PUBLIC_LANDMARK.latitude,
      longitude: SIMULATED_PUBLIC_LANDMARK.longitude,
    };
  }
  if (kind === 'private' && q.includes(SIMULATED_PRIVATE_ADDRESS.match)) {
    return {
      latitude: SIMULATED_PRIVATE_ADDRESS.latitude,
      longitude: SIMULATED_PRIVATE_ADDRESS.longitude,
    };
  }
  return null;
}
