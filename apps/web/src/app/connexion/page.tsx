'use client';

import { useState } from 'react';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import {
  AuthenticationForm,
  type AuthProvider,
} from '@/components/auth/AuthenticationForm';
import { apiFetch } from '@/lib/api';
import {
  buildAuthorizeUrl,
  createPkceChallenge,
  storePkce,
  type OauthPublicConfig,
} from '@/lib/oauth-pkce';

export default function ConnexionPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onProvider(provider: AuthProvider) {
    setError(null);
    setLoading(true);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Non envoyé — vérifiez votre connexion.');
      setLoading(false);
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
        setLoading(false);
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
      window.location.assign(url);
    } catch {
      setError('Impossible de démarrer la connexion OAuth.');
      setLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <AuthenticationForm
        onProvider={onProvider}
        error={error}
        loading={loading}
      />
    </AuthPageShell>
  );
}
