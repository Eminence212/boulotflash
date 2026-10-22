'use client';

import { useState } from 'react';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import {
  AuthenticationForm,
  type AuthProvider,
} from '@/components/auth/AuthenticationForm';

export default function ConnexionPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onProvider(provider: AuthProvider) {
    setError(null);
    setMessage(null);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Non envoyé — vérifiez votre connexion.');
      return;
    }
    try {
      sessionStorage.setItem(
        'bf_legal_acceptance',
        JSON.stringify({
          ageConfirmed: true,
          acceptTerms: true,
          acceptPrivacy: true,
          at: new Date().toISOString(),
        }),
      );
    } catch {
      // sessionStorage indisponible
    }
    setMessage(
      `Connexion ${provider} disponible à l’étape 09 (verifiers OAuth réels). Vos acceptations juridiques sont enregistrées pour la suite.`,
    );
  }

  return (
    <AuthPageShell>
      <AuthenticationForm
        onProvider={onProvider}
        error={error}
        message={message}
      />
    </AuthPageShell>
  );
}
