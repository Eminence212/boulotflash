'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { PhoneField } from '@/components/boulotflash/PhoneField';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import { apiFetch, clearAccessToken, readAccessToken } from '@/lib/api';
import { tokens } from '@/theme/tokens';

type MeResponse = {
  displayName?: string | null;
  phone?: string | null;
  missing?: { phone?: boolean; displayName?: boolean };
  needsProfileCompletion?: boolean;
  message?: string;
  code?: string;
};

export default function CompleterProfilPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [boot, setBoot] = useState(true);

  const form = useForm({
    initialValues: {
      displayName: '',
      phone: '',
    },
    validate: {
      displayName: (v) =>
        v.trim().length >= 2 && v.trim().length <= 80
          ? null
          : 'Nom entre 2 et 80 caractères.',
      phone: (v) =>
        /^\+?243\d{9}$|^0\d{9}$|^\d{9}$/.test(v.replace(/\s/g, ''))
          ? null
          : 'Numéro Kinshasa : +243 suivi de 9 chiffres.',
    },
  });

  useEffect(() => {
    const token = readAccessToken();
    if (!token) {
      router.replace('/connexion');
      return;
    }
    void apiFetch<MeResponse>('/me', { accessToken: token }).then(
      ({ status, data }) => {
        if (status === 401) {
          clearAccessToken();
          router.replace('/connexion');
          return;
        }
        if (data.displayName) form.setFieldValue('displayName', data.displayName);
        if (data.phone) form.setFieldValue('phone', data.phone);
        setBoot(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once
  }, [router]);

  async function onSubmit(values: typeof form.values) {
    setError(null);
    setLoading(true);
    const token = readAccessToken();
    if (!token) {
      router.replace('/connexion');
      return;
    }
    const { status, data } = await apiFetch<MeResponse>('/me', {
      method: 'PATCH',
      accessToken: token,
      body: {
        displayName: values.displayName.trim(),
        phone: values.phone.trim(),
      },
    });
    setLoading(false);
    if (status >= 400) {
      setError(data.message ?? 'Enregistrement impossible.');
      return;
    }
    router.replace('/');
  }

  if (boot) {
    return <GlobalLoader fullscreen message="Chargement du profil…" />;
  }

  return (
    <AuthPageShell>
      <Paper
        radius="md"
        p={{ base: 'lg', sm: 'xl' }}
        withBorder
        shadow="sm"
        style={{ borderColor: tokens.color.border.subtle }}
      >
        <form onSubmit={form.onSubmit(onSubmit)}>
          <Stack gap="md">
            <Stack gap={6}>
              <Title order={1} fz={22} fw={800}>
                Compléter mon profil
              </Title>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
                Votre compte de connexion ne nous a pas transmis ces
                informations. Sans numéro, vous pouvez consulter les offres,
                mais pas postuler ni publier.
              </Text>
            </Stack>

            <TextInput
              label="Nom affiché"
              placeholder="Ex. Amina K."
              required
              {...form.getInputProps('displayName')}
            />
            <PhoneField
              value={form.values.phone}
              onChange={(value) => {
                form.setFieldValue('phone', value);
                form.clearFieldError('phone');
              }}
              error={form.errors.phone}
            />

            {error ? (
              <AppAlert tone="error" title="Profil">
                {error}
              </AppAlert>
            ) : null}

            <AppButton type="submit" color="flash" loading={loading} fullWidth>
              Enregistrer
            </AppButton>
          </Stack>
        </form>
      </Paper>
    </AuthPageShell>
  );
}
