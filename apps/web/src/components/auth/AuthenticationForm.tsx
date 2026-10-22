'use client';

import Link from 'next/link';
import {
  Alert,
  Anchor,
  Checkbox,
  Divider,
  Group,
  Paper,
  type PaperProps,
  Stack,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { tokens } from '@/theme/tokens';
import {
  FacebookButton,
  GoogleButton,
  InstagramButton,
} from './oauth-buttons';

export type AuthProvider = 'google' | 'facebook' | 'instagram';

type AuthenticationFormProps = PaperProps & {
  onProvider: (provider: AuthProvider) => void;
  error?: string | null;
  message?: string | null;
};

/**
 * Formulaire de connexion OAuth — style Mantine AuthenticationForm
 * (Paper, boutons sociaux radius xl, cases d’acceptation).
 * Pas d’e-mail / mot de passe (D29).
 */
export function AuthenticationForm({
  onProvider,
  error,
  message,
  ...paperProps
}: AuthenticationFormProps) {
  const form = useForm({
    initialValues: {
      ageConfirmed: false,
      acceptLegal: false,
    },
    validate: {
      ageConfirmed: (v) => (v ? null : 'Confirmez que vous avez au moins 18 ans.'),
      acceptLegal: (v) =>
        v
          ? null
          : 'Acceptez les Conditions d’utilisation et la Politique de confidentialité.',
    },
  });

  const canContinue =
    form.values.ageConfirmed && form.values.acceptLegal;

  function tryProvider(provider: AuthProvider) {
    const result = form.validate();
    if (result.hasErrors) return;
    onProvider(provider);
  }

  const oauthButtons = (
    <>
      <GoogleButton
        radius="xl"
        disabled={!canContinue}
        onClick={() => tryProvider('google')}
      >
        Google
      </GoogleButton>
      <FacebookButton
        radius="xl"
        disabled={!canContinue}
        onClick={() => tryProvider('facebook')}
      >
        Facebook
      </FacebookButton>
      <InstagramButton
        radius="xl"
        disabled={!canContinue}
        onClick={() => tryProvider('instagram')}
      >
        Instagram
      </InstagramButton>
    </>
  );

  return (
    <Paper radius="md" p="lg" withBorder {...paperProps}>
      <Text
        size="lg"
        fw={500}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Bienvenue sur {tokens.copy.brand}, connectez-vous avec
      </Text>

      {/* Desktop / tablette : boutons côte à côte comme le demo Mantine */}
      <Group
        grow
        mb="md"
        mt="md"
        preventGrowOverflow={false}
        visibleFrom="sm"
      >
        {oauthButtons}
      </Group>
      {/* Mobile : pile pleine largeur */}
      <Stack gap="sm" mb="md" mt="md" hiddenFrom="sm">
        {oauthButtons}
      </Stack>

      <Divider
        label="Pas de mot de passe ni de code SMS"
        labelPosition="center"
        my="lg"
      />

      <Stack>
        <Checkbox
          label="J’ai au moins 18 ans"
          checked={form.values.ageConfirmed}
          onChange={(event) =>
            form.setFieldValue('ageConfirmed', event.currentTarget.checked)
          }
          error={form.errors.ageConfirmed}
        />

        <Checkbox
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
            </Text>
          }
          checked={form.values.acceptLegal}
          onChange={(event) =>
            form.setFieldValue('acceptLegal', event.currentTarget.checked)
          }
          error={form.errors.acceptLegal}
          styles={{ body: { alignItems: 'flex-start' } }}
        />
      </Stack>

      <Group justify="space-between" mt="xl" wrap="wrap">
        <Text size="xs" c="dimmed" maw="70%">
          {canContinue
            ? 'Choisissez un fournisseur ci-dessus.'
            : 'Cochez les deux cases pour activer les boutons.'}
        </Text>
      </Group>

      {error ? (
        <Alert color="red" variant="light" title="Connexion" radius="md" mt="md">
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert color="flash" variant="light" title="Bientôt" radius="md" mt="md">
          {message}
        </Alert>
      ) : null}

      <Text size="xs" c="dimmed" ta="center" mt="lg">
        Déconnexion disponible dans le profil. Les comptes admin ne passent pas
        par cet écran.
      </Text>
    </Paper>
  );
}
