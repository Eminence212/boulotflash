'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Title,
  Text,
  Stack,
  Button,
  Checkbox,
  Alert,
  Group,
} from '@mantine/core';
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setMessage(
      `Connexion ${provider} disponible à l’étape 09 (verifiers OAuth réels).`,
    );
  }

  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 flex justify-center">
      <Stack maw={360} w="100%" gap="md">
        <Group gap="sm" align="center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/boulotflash.svg"
            alt={tokens.copy.brand}
            height={32}
            style={{ height: 32, width: 'auto' }}
          />
        </Group>

        <Title
          order={1}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            color: tokens.color.brand.ink,
          }}
        >
          Bienvenue sur{' '}
          <span style={{ color: tokens.color.brand.flash }}>
            {tokens.copy.brand}
          </span>
        </Title>

        <Text size="sm" c="dimmed">
          Connectez-vous avec un compte existant. Pas de mot de passe public, pas
          de code SMS.
        </Text>

        <Stack gap="sm">
          {PROVIDERS.map((p) => (
            <Button
              key={p.id}
              variant="default"
              size="md"
              fullWidth
              justify="flex-start"
              leftSection={
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.src} alt="" width={22} height={22} />
              }
              onClick={() => onOAuth(p.id)}
              styles={{
                root: {
                  borderColor: tokens.color.border.subtle,
                  fontWeight: 600,
                },
              }}
            >
              {p.label}
            </Button>
          ))}
        </Stack>

        <Checkbox
          checked={ageOk}
          onChange={(e) => setAgeOk(e.currentTarget.checked)}
          label="J’ai au moins 18 ans et j’accepte les règles (projet, non validé)."
          styles={{ label: { fontSize: '0.85rem' } }}
        />

        <Text size="xs" c="dimmed">
          <Link href="/conditions" style={{ color: 'inherit' }}>
            Conditions d’utilisation
          </Link>
          {' · '}
          <Link href="/confidentialite" style={{ color: 'inherit' }}>
            Politique de confidentialité
          </Link>
          {' '}
          (projet, non validé)
        </Text>

        {error ? (
          <Alert color="red" title="Connexion">
            {error}
          </Alert>
        ) : null}
        {message ? (
          <Alert color="blue" title="Bientôt">
            {message}
          </Alert>
        ) : null}

        <Text size="xs" c="dimmed">
          Déconnexion disponible dans le profil. Les comptes admin ne passent pas
          par cet écran.
        </Text>
      </Stack>
    </main>
  );
}
