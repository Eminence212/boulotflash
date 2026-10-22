'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Text,
  Stack,
  Button,
  Checkbox,
  Alert,
  Anchor,
} from '@mantine/core';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { tokens } from '@/theme/tokens';

type Provider = 'google' | 'facebook' | 'instagram';

const PROVIDERS: { id: Provider; label: string; src: string }[] = [
  {
    id: 'google',
    label: 'Continuer avec Google',
    src: '/oauth/google.svg',
  },
  {
    id: 'facebook',
    label: 'Continuer avec Facebook',
    src: '/oauth/facebook.svg',
  },
  {
    id: 'instagram',
    label: 'Continuer avec Instagram',
    src: '/oauth/instagram.svg',
  },
];

export default function ConnexionPage() {
  const [ageOk, setAgeOk] = useState(false);
  const [legalOk, setLegalOk] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canContinue = ageOk && legalOk;

  function onOAuth(provider: Provider) {
    setError(null);
    setMessage(null);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('Non envoyé — vérifiez votre connexion.');
      return;
    }
    if (!ageOk) {
      setError('Confirmez que vous avez au moins 18 ans.');
      return;
    }
    if (!legalOk) {
      setError(
        'Acceptez les Conditions d’utilisation et la Politique de confidentialité.',
      );
      return;
    }
    // Conservé pour l’étape 09 (verifiers OAuth) — acceptation déjà cochée côté UI.
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
    <AuthPageShell
      title={
        <>
          Bienvenue sur{' '}
          <Text span inherit style={{ color: tokens.color.brand.flash }}>
            {tokens.copy.brand}
          </Text>
        </>
      }
      subtitle="Connectez-vous avec un compte existant. Pas de mot de passe public, pas de code SMS."
    >
      <Stack gap="md">
        <Stack gap="sm">
          {PROVIDERS.map((p) => (
            <Button
              key={p.id}
              variant="default"
              size="lg"
              fullWidth
              justify="flex-start"
              radius="md"
              disabled={!canContinue}
              leftSection={
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.src} alt="" width={22} height={22} />
              }
              onClick={() => onOAuth(p.id)}
              styles={{
                root: {
                  borderColor: tokens.color.border.subtle,
                  fontWeight: 600,
                  minHeight: 48,
                },
                label: {
                  whiteSpace: 'normal',
                  textAlign: 'left',
                },
              }}
            >
              {p.label}
            </Button>
          ))}
        </Stack>

        <Stack gap="sm">
          <Checkbox
            checked={ageOk}
            onChange={(e) => setAgeOk(e.currentTarget.checked)}
            label="J’ai au moins 18 ans."
            styles={{
              label: {
                fontSize: 'var(--mantine-font-size-sm)',
                lineHeight: 1.4,
              },
              body: { alignItems: 'flex-start' },
            }}
          />
          <Checkbox
            checked={legalOk}
            onChange={(e) => setLegalOk(e.currentTarget.checked)}
            label={
              <Text size="sm" component="span">
                J’accepte les{' '}
                <Anchor
                  component={Link}
                  href="/conditions"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                >
                  Conditions d’utilisation
                </Anchor>{' '}
                et la{' '}
                <Anchor
                  component={Link}
                  href="/confidentialite"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                >
                  Politique de confidentialité
                </Anchor>
                .
              </Text>
            }
            styles={{
              body: { alignItems: 'flex-start' },
            }}
          />
        </Stack>

        {!canContinue ? (
          <Text size="xs" c="dimmed" ta="center">
            Cochez les deux cases pour activer la connexion.
          </Text>
        ) : null}

        {error ? (
          <Alert color="red" variant="light" title="Connexion" radius="md">
            {error}
          </Alert>
        ) : null}
        {message ? (
          <Alert color="flash" variant="light" title="Bientôt" radius="md">
            {message}
          </Alert>
        ) : null}

        <Text size="xs" c="dimmed" ta="center">
          Déconnexion disponible dans le profil. Les comptes admin ne passent pas
          par cet écran.
        </Text>
      </Stack>
    </AuthPageShell>
  );
}
