'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Stack } from '@mantine/core';
import { AppAlert, GlobalLoader } from '@/components/feedback';
import { MissionFormSheet } from '@/components/jobs/MissionFormSheet';
import { PublishJobForm } from '@/components/jobs/PublishJobForm';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { isEmployerMode } from '@/lib/me';

export default function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { me, loading, refresh } = useMe({ requireAuth: true });

  if (loading || !me) {
    return <GlobalLoader fullscreen />;
  }

  const employer = isEmployerMode(me);
  const canForm =
    employer &&
    !!me.employerProfile &&
    me.status !== 'SUSPENDED' &&
    me.status !== 'CLOSED';

  return (
    <AppShellLayout me={me}>
      <MissionFormSheet
        title="Modifier la mission"
        onClose={() => router.push('/missions')}
      >
        <Stack gap="sm" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {!canForm ? (
            <AppAlert tone="warning" title="Accès">
              Impossible de modifier cette offre avec le compte actuel.
            </AppAlert>
          ) : (
            <PublishJobForm initialJobId={id} />
          )}
        </Stack>
      </MissionFormSheet>
    </AppShellLayout>
  );
}
