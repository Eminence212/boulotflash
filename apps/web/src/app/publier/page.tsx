'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Anchor, Stack } from '@mantine/core';
import { AppAlert, GlobalLoader } from '@/components/feedback';
import { MissionFormSheet } from '@/components/jobs/MissionFormSheet';
import { PublishJobForm } from '@/components/jobs/PublishJobForm';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { isEmployerMode } from '@/lib/me';

export default function PublierPage() {
  const router = useRouter();
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
    <AppShellLayout me={me} onModeChanged={() => void refresh()}>
      <MissionFormSheet title="Créer une mission" onClose={() => router.push('/missions')}>
        <Stack gap="sm" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
      </MissionFormSheet>
    </AppShellLayout>
  );
}
