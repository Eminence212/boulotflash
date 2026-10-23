'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Anchor, Stack, Text, Title } from '@mantine/core';
import { AppAlert, AppButton } from '@/components/feedback';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import { isEmployerMode } from '@/lib/me';

/**
 * Garde publication (étape 11) — formulaire complet = étape 12.
 */
export default function PublierPage() {
  const { me, loading, refresh } = useMe({ requireAuth: true });
  const [result, setResult] = useState<{
    ok?: boolean;
    code?: string;
    message?: string;
    label?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function tryPublish() {
    setBusy(true);
    setResult(null);
    const token = readAccessToken();
    if (!token) return;
    const { status, data } = await apiFetch<{
      ok?: boolean;
      message?: string;
      code?: string;
      subscription?: { label?: string };
    }>('/jobs', {
      method: 'POST',
      accessToken: token,
      body: {},
    });
    setBusy(false);
    setResult({
      ok: status < 400,
      code: data.code,
      message: data.message,
      label: data.subscription?.label,
    });
  }

  if (loading || !me) {
    return (
      <AppShellLayout me={me} onModeChanged={() => void refresh()}>
        <Text c="dimmed" size="sm">
          Chargement…
        </Text>
      </AppShellLayout>
    );
  }

  const employer = isEmployerMode(me);
  const suspended = me.status === 'SUSPENDED' || me.status === 'CLOSED';
  const subInactive =
    !me.subscription || me.subscription.status !== 'ACTIVE';

  return (
    <AppShellLayout me={me} title="Publier" onModeChanged={() => void refresh()}>
      <Stack gap="md">
        <Title order={1} fz={22} fw={800}>
          Publier une mission
        </Title>
        <Text size="sm" c="dimmed">
          Le formulaire guidé arrive à l’étape suivante. Ici, on vérifie
          seulement l’accès (abonnement et compte).
        </Text>

        {!employer ? (
          <AppAlert tone="info" title="Mode candidat">
            Passez en mode recruteur pour publier. Le mode candidat n’a pas
            d’action « Publier ».
          </AppAlert>
        ) : null}

        {!me.employerProfile ? (
          <AppAlert tone="warning" title="Profil recruteur">
            Créez d’abord votre profil recruteur.{' '}
            <Anchor component={Link} href="/profil/recruteur" fw={600}>
              Ouvrir le profil
            </Anchor>
          </AppAlert>
        ) : null}

        {suspended ? (
          <AppAlert tone="error" title="Compte suspendu">
            Publication impossible.
          </AppAlert>
        ) : null}

        {employer && me.employerProfile && subInactive && !suspended ? (
          <AppAlert tone="warning" title="Abonnement">
            Votre abonnement n’est pas actif.
          </AppAlert>
        ) : null}

        {employer && me.subscription?.status === 'ACTIVE' ? (
          <AppAlert tone="success" title="Services gratuits">
            Abonnement actif — aucune demande de paiement.
          </AppAlert>
        ) : null}

        <AppButton
          color="flash"
          loading={busy}
          disabled={!employer || !me.employerProfile || suspended}
          onClick={() => void tryPublish()}
          fullWidth
        >
          Vérifier l’accès publication
        </AppButton>

        {result ? (
          result.ok ? (
            <AppAlert tone="success" title="Accès autorisé">
              {result.message}
              {result.label ? ` (${result.label})` : null}
            </AppAlert>
          ) : (
            <AppAlert
              tone="error"
              title={
                result.code === 'SUBSCRIPTION_INACTIVE'
                  ? 'Votre abonnement n’est pas actif.'
                  : 'Publication refusée'
              }
            >
              {result.message}
              {result.code ? ` [${result.code}]` : null}
            </AppAlert>
          )
        ) : null}
      </Stack>
    </AppShellLayout>
  );
}
