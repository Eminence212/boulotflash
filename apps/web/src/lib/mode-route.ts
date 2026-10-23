/** Page à ouvrir quand le mode actif change. `null` = rester sur la page. */
export function pageForMode(
  pathname: string,
  mode: 'WORKER' | 'EMPLOYER',
): string | null {
  if (mode === 'EMPLOYER') {
    if (
      pathname.startsWith('/profil') &&
      !pathname.startsWith('/profil/recruteur') &&
      pathname !== '/profil/completer'
    ) {
      return '/profil/recruteur';
    }
    if (pathname.startsWith('/candidatures')) return '/missions';
    return null;
  }

  if (
    pathname.startsWith('/profil') &&
    !pathname.startsWith('/profil/candidat') &&
    pathname !== '/profil/completer'
  ) {
    return '/profil/candidat';
  }
  if (pathname === '/publier' || pathname.startsWith('/publier/')) return '/';
  if (pathname === '/missions') return '/';
  return null;
}
