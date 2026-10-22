'use client';

import { useState } from 'react';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import {
  AuthenticationForm,
  type AuthProvider,
} from '@/components/auth/AuthenticationForm';
import { useLoading } from '@/components/feedback';
import { apiFetch } from '@/lib/api';
import {
  buildAuthorizeUrl,
  createPkceChallenge,
  storePkce,
  type OauthPublicConfig,
} from '@/lib/oauth-pkce';

export default function ConnexionPage() {
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(
    null,
  );
  const { showLoader } = useLoading();

  async function onProvider(provider: AuthProvider) {
    setError(null);
    setLoadingProvider(provider);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Non envoyé — vérifiez votre connexion.');
      setLoadingProvider(null);
      return;
    }

    try {
      const { status, data } = await apiFetch<OauthPublicConfig>(
        '/auth/oauth/config',
      );
      if (status >= 400 || !data[provider]?.clientId) {
        setError(
          (data as { message?: string }).message ??
            'Configuration OAuth indisponible.',
        );
        setLoadingProvider(null);
        return;
      }

      const { codeVerifier, codeChallenge, state } =
        await createPkceChallenge();
      storePkce({
        provider,
        state,
        codeVerifier,
        ageConfirmed: true,
        acceptTerms: true,
        acceptPrivacy: true,
      });

      const url = buildAuthorizeUrl(provider, data, {
        state,
        codeChallenge,
      });
      showLoader(`Redirection vers ${provider}…`);
      window.location.assign(url);
    } catch {
      setError('Impossible de démarrer la connexion OAuth.');
      setLoadingProvider(null);
    }
  }

  return (
    <AuthPageShell>
      <AuthenticationForm
        onProvider={onProvider}
        error={error}
        loadingProvider={loadingProvider}
      />
    </AuthPageShell>
  );
}
