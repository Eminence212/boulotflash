'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearAccessToken, readAccessToken } from '@/lib/api';
import { clearPkce } from '@/lib/oauth-pkce';
import type { MeResponse } from '@/lib/me';

/** Déconnexion complète : API (refresh + blacklist) puis stockage local. */
export async function performLogout(): Promise<void> {
  const token = readAccessToken();
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      accessToken: token,
    });
  } catch {
    // Réseau / 401 : on nettoie quand même le client.
  }
  clearAccessToken();
  clearPkce();
}

export function useMe(opts: { requireAuth?: boolean } = {}) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = readAccessToken();
    if (!token) {
      setMe(null);
      setLoading(false);
      if (opts.requireAuth) router.replace('/connexion');
      return null;
    }
    // Pas de retour au chargement plein écran après un enregistrement ou un changement de mode :
    // seul le premier chargement affiche le loader.
    const { status, data } = await apiFetch<MeResponse>('/me', {
      accessToken: token,
    });
    if (status === 401) {
      clearAccessToken();
      clearPkce();
      setMe(null);
      setLoading(false);
      if (opts.requireAuth) router.replace('/connexion');
      return null;
    }
    if (status >= 400) {
      setError(data.message ?? 'Session invalide.');
      setLoading(false);
      return null;
    }
    setMe(data);
    setError(null);
    setLoading(false);
    return data;
  }, [opts.requireAuth, router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await performLogout();
    setMe(null);
    setError(null);
    setLoading(false);
    // Pleine page pour forcer l’état invité même si l’URL est déjà `/`.
    window.location.assign('/');
  }, []);

  return { me, loading, error, refresh, logout, token: readAccessToken() };
}
