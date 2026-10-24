/**
 * Lecture de la position du navigateur et messages d’échec par cause.
 * Un échec « position introuvable » (Wi-Fi coupé, localisation de l’appareil inactive) ou « trop lent »
 * se réessaie ; un refus ne se réessaie pas depuis la page : seul le navigateur peut le lever.
 */

export type GeolocationFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

/** Codes de `GeolocationPositionError` : 1 refus, 2 indisponible, 3 délai dépassé. */
export function geolocationFailure(err: unknown): GeolocationFailure {
  const code = (err as { code?: unknown } | null)?.code;
  if (code === 1) return 'denied';
  if (code === 3) return 'timeout';
  if (code === 2) return 'unavailable';
  return 'unsupported';
}

export function geolocationFailureMessage(failure: GeolocationFailure): string {
  switch (failure) {
    case 'denied':
      return 'Position refusée. Autorisez la localisation pour ce site dans le navigateur, puis rechargez la page.';
    case 'unavailable':
      return 'Position introuvable pour le moment. Vérifiez que la localisation de l’appareil est active, puis réessayez.';
    case 'timeout':
      return 'La position met trop de temps à arriver. Réessayez.';
    default:
      return 'Ce navigateur ne donne pas la position.';
  }
}

/** Seul un refus explicite rend le bouton inutile ; les autres échecs peuvent passer au second essai. */
export function canRetry(failure: GeolocationFailure): boolean {
  return failure === 'unavailable' || failure === 'timeout';
}

export function readBrowserPosition(maximumAgeMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: maximumAgeMs,
      timeout: 12_000,
    });
  });
}
