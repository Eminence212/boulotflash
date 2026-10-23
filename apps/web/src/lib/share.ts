/**
 * Partage d’une URL publique — copie + feuille native si disponible.
 * Aucun envoi automatique (WhatsApp, etc.).
 */

function absoluteUrl(path: string): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  return path.startsWith('http') ? path : `${origin}${path}`;
}

/** Copie uniquement l’URL dans le presse-papiers. */
export async function copyPublicUrl(path: string): Promise<boolean> {
  const url = absoluteUrl(path);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Feuille de partage native si disponible, sinon copie le lien.
 * Ne force pas d’app tierce.
 */
export async function sharePublicUrl(
  path: string,
  title: string,
): Promise<'shared' | 'copied' | 'failed'> {
  const url = absoluteUrl(path);

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url, text: title });
      return 'shared';
    } catch {
      // annulation utilisateur ou indisponible → repli copie
    }
  }

  const copied = await copyPublicUrl(path);
  return copied ? 'copied' : 'failed';
}
