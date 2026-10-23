'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Stack, Text, Title, List, Anchor, Group } from '@mantine/core';
import { AppAlert } from '@/components/feedback';
import { JobCard } from '@/components/boulotflash/JobCard';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { apiFetch } from '@/lib/api';
import { isEmployerMode, type PublicJob } from '@/lib/me';
import { tokens } from '@/theme/tokens';

export default function HomePage() {
  const { me, loading, refresh } = useMe();
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ items?: PublicJob[] }>('/jobs').then(({ status, data }) => {
      if (status >= 400) {
        setJobsError(data.message ?? 'Liste des offres indisponible.');
        return;
      }
      setJobs(data.items ?? []);
    });
  }, []);

  const gaps = me?.gaps ?? [];
  const employer = isEmployerMode(me);

  return (
    <AppShellLayout
      me={me}
      onModeChanged={() => {
        void refresh();
      }}
    >
      <Stack gap="lg">
        <Stack gap={6}>
          <Title
            order={1}
            fz={{ base: 26, sm: 30 }}
            fw={800}
            style={{ fontFamily: tokens.typography.fontFamily.display }}
          >
            Trouvez un{' '}
            <Text span c="flash" inherit>
              travail
            </Text>{' '}
            aujourd’hui.
          </Title>
          <Text size="sm" c="dimmed">
            Missions près de vous à Kinshasa. Consultez librement — candidature
            et publication demandent un profil complet.
          </Text>
        </Stack>

        {loading && me ? (
          <Text size="sm" c="dimmed">
            Chargement du profil…
          </Text>
        ) : null}

        {me && gaps.length > 0 ? (
          <AppAlert tone="warning" title="Profil à compléter">
            <Text size="sm" mb="xs">
              Il manque : {gaps.join(', ')}. La liste des offres reste ouverte.
            </Text>
            <List size="sm" spacing={4}>
              {gaps.map((g) => (
                <List.Item key={g}>{g}</List.Item>
              ))}
            </List>
            <Group mt="sm" gap="sm">
              {me.needsProfileCompletion ? (
                <Anchor component={Link} href="/profil/completer" size="sm" fw={600}>
                  Compléter mon profil
                </Anchor>
              ) : null}
              <Anchor
                component={Link}
                href={employer ? '/profil/recruteur' : '/profil/candidat'}
                size="sm"
                fw={600}
              >
                Ouvrir le profil {employer ? 'recruteur' : 'candidat'}
              </Anchor>
            </Group>
          </AppAlert>
        ) : null}

        {me?.status === 'SUSPENDED' ? (
          <AppAlert tone="error" title="Compte suspendu">
            Consultation limitée. La publication est bloquée.
          </AppAlert>
        ) : null}

        {employer && me?.subscription?.status === 'EXPIRED' ? (
          <AppAlert tone="warning" title="Abonnement">
            Votre abonnement n’est pas actif. La publication est refusée.
          </AppAlert>
        ) : null}

        <Stack gap="sm">
          <Text
            size="xs"
            tt="uppercase"
            fw={700}
            c="dimmed"
            style={{ letterSpacing: '0.04em' }}
          >
            Missions près de vous
          </Text>
          {jobsError ? (
            <AppAlert tone="error" title="Offres">
              {jobsError}
            </AppAlert>
          ) : null}
          {jobs.length === 0 && !jobsError ? (
            <Text size="sm" c="dimmed">
              Aucune offre publiée pour le moment.
            </Text>
          ) : null}
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </Stack>
      </Stack>
    </AppShellLayout>
  );
}
