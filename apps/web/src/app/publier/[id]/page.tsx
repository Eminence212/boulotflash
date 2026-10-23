'use client';

import { use } from 'react';
import Link from 'next/link';
import { Anchor, Stack, Text, Title } from '@mantine/core';
import { AppAlert, GlobalLoader } from '@/components/feedback';
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
    <AppShellLayout
      me={me}
      title="Modifier la mission"
      onModeChanged={() => void refresh()}
    >
      <Stack gap="md">
        <Title order={1} fz={22} fw={800}>
          Modifier la mission
        </Title>
        <Text size="sm" c="dimmed">
          <Anchor component={Link} href="/missions" fw={600}>
            ← Mes missions
          </Anchor>
        </Text>

        {!canForm ? (
          <AppAlert tone="warning" title="Accès">
            Impossible de modifier cette offre avec le compte actuel.
          </AppAlert>
        ) : (
          <PublishJobForm initialJobId={id} />
        )}
      </Stack>
    </AppShellLayout>
  );
}
