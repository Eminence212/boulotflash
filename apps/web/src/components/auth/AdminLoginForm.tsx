'use client';

import { useState } from 'react';
import {
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { AppAlert, AppButton } from '@/components/feedback';
import { tokens } from '@/theme/tokens';

type Step = 'credentials' | 'totp';

type AdminLoginFormProps = {
  onCredentials: (username: string, password: string) => Promise<void>;
  onTotp: (code: string) => Promise<void>;
  error?: string | null;
  loading?: boolean;
};

export function AdminLoginForm({
  onCredentials,
  onTotp,
  error,
  loading = false,
}: AdminLoginFormProps) {
  const [step, setStep] = useState<Step>('credentials');

  const creds = useForm({
    initialValues: { username: '', password: '' },
    validate: {
      username: (v) => (v.trim() ? null : 'Identifiant requis.'),
      password: (v) => (v ? null : 'Mot de passe requis.'),
    },
  });

  const totp = useForm({
    initialValues: { code: '' },
    validate: {
      code: (v) =>
        /^\d{6}$/.test(v.trim()) || v.trim().startsWith('BF-')
          ? null
          : 'Code à 6 chiffres ou code de secours.',
    },
  });

  async function submitCreds() {
    const result = creds.validate();
    if (result.hasErrors) return;
    try {
      await onCredentials(creds.values.username.trim(), creds.values.password);
      setStep('totp');
    } catch {
      // Reste sur l’étape identifiants.
    }
  }

  async function submitTotp() {
    const result = totp.validate();
    if (result.hasErrors) return;
    await onTotp(totp.values.code.trim());
  }

  return (
    <Paper
      radius="md"
      p={{ base: 'lg', sm: 'xl' }}
      withBorder
      shadow="sm"
      style={{ borderColor: tokens.color.border.subtle }}
    >
      <Stack gap="lg">
        <Stack gap={6}>
          <Title
            order={1}
            fz={{ base: 22, sm: 24 }}
            fw={800}
            style={{ fontFamily: 'var(--font-display)', lineHeight: 1.25 }}
          >
            Administration
          </Title>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            {step === 'credentials'
              ? 'Identifiant, mot de passe, puis code d’authentification.'
              : 'Saisissez le code de votre application d’authentification.'}
          </Text>
        </Stack>

        {step === 'credentials' ? (
          <Stack gap="md" component="form" onSubmit={(e) => { e.preventDefault(); void submitCreds(); }}>
            <TextInput
              label="Identifiant"
              autoComplete="username"
              {...creds.getInputProps('username')}
            />
            <PasswordInput
              label="Mot de passe"
              autoComplete="current-password"
              {...creds.getInputProps('password')}
            />
            <AppButton type="submit" fullWidth loading={loading} radius="xl">
              Continuer
            </AppButton>
          </Stack>
        ) : (
          <Stack gap="md" component="form" onSubmit={(e) => { e.preventDefault(); void submitTotp(); }}>
            <TextInput
              label="Code TOTP"
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              {...totp.getInputProps('code')}
            />
            <AppButton type="submit" fullWidth loading={loading} radius="xl">
              Se connecter
            </AppButton>
            <AppButton
              type="button"
              variant="subtle"
              fullWidth
              disabled={loading}
              onClick={() => {
                setStep('credentials');
                totp.reset();
              }}
            >
              Retour
            </AppButton>
          </Stack>
        )}

        {error ? (
          <AppAlert tone="error" title="Connexion admin">
            {error}
          </AppAlert>
        ) : null}
      </Stack>
    </Paper>
  );
}
