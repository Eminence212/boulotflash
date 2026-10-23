'use client';

import Link from 'next/link';
import { Anchor, Stack, Title } from '@mantine/core';
import { AppAlert, GlobalLoader } from '@/components/feedback';
import { PublishJobForm } from '@/components/jobs/PublishJobForm';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { isEmployerMode } from '@/lib/me';

export default function PublierPage() {
  const { me, loading, refresh } = useMe({ requireAuth: true });

  if (loading || !me) {
    return <GlobalLoader fullscreen />;
  }

  const employer = isEmployerMode(me);
  const suspended = me.status === 'SUSPENDED' || me.status === 'CLOSED';
  const subInactive = !me.subscription || me.subscription.status !== 'ACTIVE';
  const canForm =
    employer && !!me.employerProfile && !suspended && !subInactive;

  return (
    <AppShellLayout me={me} title="Créer une mission" onModeChanged={() => void refresh()}>
      <Stack gap="md">
        <Title order={1} fz={22} fw={800}>
          Créer une mission
        </Title>

        {!employer ? (
          <AppAlert tone="info" title="Mode candidat">
            Passez en mode recruteur pour publier.
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

        {canForm ? <PublishJobForm /> : null}
      </Stack>
    </AppShellLayout>
  );
}
