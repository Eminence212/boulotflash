/** Photo renvoyée par Google, Facebook ou GitHub. Une silhouette Facebook n’est pas une photo. */
export function readProviderPicture(picture: unknown): string | null {
  if (typeof picture === 'string') {
    const url = picture.trim();
    return url || null;
  }
  if (!picture || typeof picture !== 'object') return null;

  const data = (picture as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;

  const record = data as { url?: unknown; is_silhouette?: unknown };
  if (record.is_silhouette === true) return null;

  return typeof record.url === 'string' && record.url.trim()
    ? record.url.trim()
    : null;
}

/**
 * Miniature Google (`=s96-c`) → taille utilisable sur la carte.
 * Ne s’applique qu’aux URLs renvoyées par Gmail / Google.
 */
export function googleProfilePhotoUrl(url: string | null): string | null {
  if (!url?.trim()) return null;
  return url.trim().replace(/=s\d+(-[a-z0-9]+)*$/i, '=s256-c');
}

type GooglePeoplePhoto = {
  url: string;
  isDefault: boolean;
  profileSource: boolean;
};

/** Photo People API : la vraie photo de profil, pas la lettre générée si une autre existe. */
export function pickGooglePeoplePhoto(photos: unknown): string | null {
  if (!Array.isArray(photos)) return null;
  const items: GooglePeoplePhoto[] = [];
  for (const photo of photos) {
    if (!photo || typeof photo !== 'object') continue;
    const record = photo as {
      url?: unknown;
      default?: unknown;
      metadata?: { source?: { type?: unknown } };
    };
    if (typeof record.url !== 'string' || !record.url.trim()) continue;
    items.push({
      url: record.url.trim(),
      isDefault: record.default === true,
      profileSource: record.metadata?.source?.type === 'PROFILE',
    });
  }
  const chosen =
    items.find((photo) => photo.profileSource && !photo.isDefault) ??
    items.find((photo) => !photo.isDefault) ??
    items[0];
  return googleProfilePhotoUrl(chosen?.url ?? null);
}

/** Photo hébergée par Google : le navigateur la refuse souvent en image tierce. */
export function isGoogleAvatarUrl(url: string | null | undefined): url is string {
  if (!url?.trim()) return false;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  return host === 'googleusercontent.com' || host.endsWith('.googleusercontent.com');
}

/**
 * URL à mettre dans `<img>`. Les photos Gmail passent par l’API,
 * les autres providers restent inchangés.
 */
export function clientAvatarUrl(
  userId: string,
  avatarUrl: string | null,
): string | null {
  if (!isGoogleAvatarUrl(avatarUrl)) return avatarUrl;
  const version = avatarUrl.slice(-16).replace(/[^a-z0-9]/gi, '');
  return `/api/v1/avatars/${userId}?v=${version}`;
}

/** URL déjà enregistrée depuis un provider : on peut la remplacer à la connexion suivante. */
export function isProviderAvatarUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    host === 'graph.facebook.com' ||
    host.endsWith('.googleusercontent.com') ||
    host.endsWith('.fbcdn.net') ||
    host.endsWith('.fbsbx.com') ||
    host.endsWith('.githubusercontent.com')
  );
}
