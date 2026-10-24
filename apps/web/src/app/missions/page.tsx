'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Group, Stack, Text } from '@mantine/core';
import { IconBriefcase, IconPlus, IconShare, IconUsers } from '@tabler/icons-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import { jobStatusLabel, jobStatusTone } from '@/lib/job-status';
import { isEmployerMode } from '@/lib/me';
import { sharePublicUrl } from '@/lib/share';
import { tokens } from '@/theme/tokens';

const SHAREABLE = new Set([
  'PUBLISHED',
  'FILLED',
  'EXPIRED',
  'CANCELLED',
  'COMPLETED',
]);

type MineItem = {
  id: string;
  title: string;
  status: string;
  rejectionReason: string | null;
  commune: string;
  workersNeeded: number;
  applicationsCount: number;
  confirmedParticipationsCount: number;
};

type MineResponse = {
  subscription?: { status?: string | null; label?: string };
  items?: MineItem[];
};

export default function MissionsPage() {
  const { me, loading, refresh } = useMe({ requireAuth: true });
  const [items, setItems] = useState<MineItem[]>([]);
  const [subLabel, setSubLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listReady, setListReady] = useState(false);

  const load = useCallback(async () => {
    const token = readAccessToken();
    if (!token) return;
    const { status, data } = await apiFetch<MineResponse>('/jobs/mine', {
      accessToken: token,
    });
    if (status >= 400) {
      setError(data.message ?? 'Impossible de charger vos missions.');
      return;
    }
    setItems(data.items ?? []);
    setSubLabel(data.subscription?.label ?? null);
    setError(null);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!me || !isEmployerMode(me)) {
      setListReady(true);
      return;
    }
    let cancelled = false;
    void load().finally(() => {
      if (!cancelled) setListReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, me, load]);

  async function republish(id: string) {
    const token = readAccessToken();
    if (!token) return;
    setBusyId(id);
    const { status, data } = await apiFetch<{ id?: string; message?: string }>(
      `/jobs/${id}/republish`,
      { method: 'POST', accessToken: token },
    );
    setBusyId(null);
    if (status >= 400 || !data.id) {
      setError(data.message ?? 'Republication impossible.');
      return;
    }
    window.location.assign(`/publier/${data.id}`);
  }

  if (loading || !me || !listReady) {
    return <GlobalLoader fullscreen />;
  }

  const employer = isEmployerMode(me);

  return (
    <AppShellLayout me={me}>
      <Stack gap="md">
        <PageHeader
          title="Mes missions"
          description={
            subLabel
              ? `Abonnement : ${subLabel}`
              : 'Vos offres, leurs candidatures et leur statut.'
          }
          actions={
            employer ? (
              <Button
                component={Link}
                href="/publier"
                color="flash"
                leftSection={<IconPlus size={18} stroke={2} aria-hidden />}
              >
                Créer
              </Button>
            ) : null
          }
        />

        {!employer ? (
          <AppAlert tone="info" title="Mode candidat">
            Passez en mode recruteur pour voir vos missions.
          </AppAlert>
        ) : null}

        {error ? (
          <AppAlert tone="error" title="Missions">
            {error}
          </AppAlert>
        ) : null}

        {employer && items.length === 0 && !error ? (
          <EmptyState
            icon={IconBriefcase}
            title="Aucune mission pour l’instant"
            description="Décrivez la mission, la date, le lieu et la rémunération. Votre première offre est vérifiée par l’équipe avant publication."
            action={{ label: 'Créer une mission', href: '/publier' }}
          />
        ) : null}

        {items.map((job) => (
          <Stack
            key={job.id}
            gap="xs"
            p="md"
            style={{
              border: `1px solid ${tokens.color.border.subtle}`,
              borderRadius: 12,
              background: tokens.color.surface.card,
            }}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Text fw={700} style={{ lineHeight: 1.3 }}>
                {job.title}
              </Text>
              <StatusBadge tone={jobStatusTone(job.status)}>
                {jobStatusLabel(job.status)}
              </StatusBadge>
            </Group>
            <Text size="sm" c="dimmed">
              <strong>{job.workersNeeded}</strong> place
              {job.workersNeeded > 1 ? 's' : ''} · <strong>{job.commune}</strong>{' '}
              · <strong>{job.applicationsCount}</strong> candidature
              {job.applicationsCount !== 1 ? 's' : ''} ·{' '}
              <strong>{job.confirmedParticipationsCount}</strong> acceptée
              {job.confirmedParticipationsCount !== 1 ? 's' : ''}
            </Text>
            {job.rejectionReason ? (
              <AppAlert tone="error" title="Motif de rejet">
                {job.rejectionReason}
              </AppAlert>
            ) : null}
            {job.status === 'IN_REVIEW' ? (
              <Text size="sm" c={tokens.color.status.attente.fg}>
                En attente de vérification par l’équipe BoulotFlash. Rien à faire
                de votre côté : elle sera publiée ou refusée avec un motif.
              </Text>
            ) : !SHAREABLE.has(job.status) ? (
              <Text size="xs" c="dimmed">
                Partager indisponible tant que l’offre n’est pas publiée.
              </Text>
            ) : null}
            <Group gap="sm">
              {job.applicationsCount > 0 || job.status === 'PUBLISHED' || job.status === 'FILLED' ? (
                <Button
                  component={Link}
                  href={`/missions/${job.id}/candidatures`}
                  size="sm"
                  color="flash"
                  leftSection={<IconUsers size={16} stroke={2} aria-hidden />}
                >
                  Candidatures ({job.applicationsCount})
                </Button>
              ) : null}
              {job.status === 'DRAFT' || job.status === 'REJECTED' ? (
                <AppButton
                  variant="default"
                  size="sm"
                  onClick={() => {
                    window.location.assign(`/publier/${job.id}`);
                  }}
                >
                  Modifier
                </AppButton>
              ) : null}
              {job.status === 'IN_REVIEW' ? (
                <AppButton
                  variant="default"
                  size="sm"
                  onClick={() => {
                    window.location.assign(`/publier/${job.id}`);
                  }}
                >
                  Voir
                </AppButton>
              ) : null}
              {SHAREABLE.has(job.status) ? (
                <>
                  <AppButton
                    variant="default"
                    size="sm"
                    onClick={() => {
                      window.location.assign(`/missions/${job.id}`);
                    }}
                  >
                    Voir
                  </AppButton>
                  <AppButton
                    variant="default"
                    size="sm"
                    leftSection={
                      <IconShare size={16} stroke={2} aria-hidden />
                    }
                    onClick={() =>
                      void sharePublicUrl(`/missions/${job.id}`, job.title)
                    }
                  >
                    Partager
                  </AppButton>
                </>
              ) : null}
              {job.status === 'PUBLISHED' ||
              job.status === 'FILLED' ||
              job.status === 'EXPIRED' ||
              job.status === 'COMPLETED' ? (
                <AppButton
                  color="flash"
                  size="sm"
                  loading={busyId === job.id}
                  onClick={() => void republish(job.id)}
                >
                  Republier
                </AppButton>
              ) : null}
            </Group>
          </Stack>
        ))}
      </Stack>
    </AppShellLayout>
  );
}
