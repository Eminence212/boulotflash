'use client';

import { use, useEffect, useState } from 'react';
import { Avatar, Group, Stack, Text, Title } from '@mantine/core';
import { AppAlert, GlobalLoader } from '@/components/feedback';
import { JobCard } from '@/components/boulotflash/JobCard';
import { BackLink } from '@/components/ui/BackLink';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconBriefcase } from '@tabler/icons-react';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { apiFetch } from '@/lib/api';
import { EMPLOYER_TYPE_LABELS, type PublicJob } from '@/lib/me';

type PublisherProfile = {
  name: string;
  avatarUrl: string | null;
  kind: string | null;
  commune: string | null;
  presentation: string | null;
  jobs: PublicJob[];
  message?: string;
};

export default function PublisherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { me, refresh } = useMe();
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    setProfile(null);
    void apiFetch<PublisherProfile>(`/publishers/${id}`).then(({ status, data }) => {
      if (cancelled) return;
      if (status === 404) {
        setError('Ce profil n’est pas disponible.');
        setProfile(null);
      } else if (status >= 400) {
        setError(data.message ?? 'Impossible de charger le profil.');
        setProfile(null);
      } else {
        setProfile(data);
        setError(null);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const kindLabel = profile?.kind
    ? (EMPLOYER_TYPE_LABELS[profile.kind] ?? null)
    : null;
  const meta = [kindLabel, profile?.commune].filter(Boolean).join(' · ');

  if (!ready && !error) {
    return <GlobalLoader fullscreen />;
  }

  return (
    <AppShellLayout
      me={me}
      title={profile?.name ?? 'Profil'}
    >
      <Stack gap="md">
        <BackLink href="/" label="Toutes les missions" />

        {error ? (
          <AppAlert tone="error" title="Profil">
            {error}
          </AppAlert>
        ) : null}

        {profile ? (
          <>
            <Group wrap="nowrap" align="center" gap="md">
              <Avatar
                src={profile.avatarUrl || undefined}
                radius="xl"
                size={72}
                color="flash"
                variant="light"
                alt=""
              >
                {profile.name.charAt(0).toUpperCase()}
              </Avatar>
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Title order={1} fz={22} fw={800} style={{ lineHeight: 1.2 }}>
                  {profile.name}
                </Title>
                {meta ? (
                  <Text size="sm" c="dimmed">
                    {meta}
                  </Text>
                ) : null}
              </Stack>
            </Group>

            {profile.presentation ? (
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {profile.presentation}
              </Text>
            ) : null}

            <Title order={2} fz={16} fw={700}>
              Missions publiées
            </Title>
            {profile.jobs.length === 0 ? (
              <EmptyState
                icon={IconBriefcase}
                title="Aucune mission publiée en ce moment"
                description="Revenez plus tard ou parcourez les autres missions."
                action={{ label: 'Voir les missions', href: '/' }}
              />
            ) : (
              profile.jobs.map((job) => <JobCard key={job.id} job={job} />)
            )}
          </>
        ) : null}
      </Stack>
    </AppShellLayout>
  );
}
