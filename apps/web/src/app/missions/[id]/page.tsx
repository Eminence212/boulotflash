'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Anchor, Group, Stack, Text, Title } from '@mantine/core';
import { Copy, ShareNetwork } from '@phosphor-icons/react';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import { AppChip } from '@/components/boulotflash/AppChip';
import { JobPostHeader } from '@/components/boulotflash/JobPostHeader';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import {
  formatMoney,
  formatStartAt,
  isEmployerMode,
  type PublicJob,
} from '@/lib/me';
import { copyPublicUrl, sharePublicUrl } from '@/lib/share';
import { jobStatusLabel, jobStatusTone } from '@/lib/job-status';
import { tokens } from '@/theme/tokens';

type PublicDetail = PublicJob & {
  description: string;
  status: string;
  closedMessage: string | null;
  distanceLabel: string;
  workersNeeded: number;
  sharePath: string;
};

export default function MissionPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { me, refresh } = useMe();
  const [job, setJob] = useState<PublicDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [applyMsg, setApplyMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setJob(null);
    setError(null);
    void apiFetch<PublicDetail>(`/jobs/${id}`).then(({ status, data }) => {
      if (cancelled) return;
      if (status === 404) {
        setError('Offre introuvable.');
        setJob(null);
        return;
      }
      if (status >= 400) {
        setError(data.message ?? 'Impossible de charger l’offre.');
        setJob(null);
        return;
      }
      setJob(data as PublicDetail);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function sharePathOf(j: PublicDetail) {
    return j.sharePath || `/missions/${j.id}`;
  }

  async function onShare() {
    if (!job) return;
    const result = await sharePublicUrl(sharePathOf(job), job.title);
    if (result === 'shared') {
      setShareMsg('Partagé.');
    } else if (result === 'copied') {
      setShareMsg('Lien copié.');
    } else {
      setShareMsg('Impossible de partager pour le moment.');
    }
  }

  async function onCopyLink() {
    if (!job) return;
    const ok = await copyPublicUrl(sharePathOf(job));
    setShareMsg(ok ? 'Lien copié.' : 'Impossible de copier le lien.');
  }

  async function onApply() {
    setApplyMsg(null);
    const token = readAccessToken();
    if (!token) {
      window.location.assign(`/connexion?next=/missions/${id}`);
      return;
    }
    setBusy(true);
    const { status, data } = await apiFetch<{ message?: string; code?: string }>(
      `/jobs/${id}/applications`,
      { method: 'POST', accessToken: token },
    );
    setBusy(false);
    if (status >= 400) {
      setApplyMsg(data.message ?? 'Candidature impossible.');
      return;
    }
    setApplyMsg(data.message ?? 'Profil prêt pour candidater.');
  }

  if (!job && !error) {
    return <GlobalLoader fullscreen />;
  }

  return (
    <AppShellLayout
      me={me}
      title={job?.title ?? 'Mission'}
      onModeChanged={() => void refresh()}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          <Anchor component={Link} href="/" fw={600}>
            ← Accueil
          </Anchor>
        </Text>

        {error ? (
          <AppAlert tone="error" title="Offre">
            {error}
          </AppAlert>
        ) : null}

        {job ? (
          <>
            <JobPostHeader job={job} />
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Title order={1} fz={22} fw={800} style={{ lineHeight: 1.25 }}>
                {job.title}
              </Title>
              <StatusBadge tone={jobStatusTone(job.status)}>
                {jobStatusLabel(job.status)}
              </StatusBadge>
            </Group>

            {job.closedMessage ? (
              <AppAlert tone="warning" title="Candidatures closes">
                {job.closedMessage}
              </AppAlert>
            ) : null}

            <Group gap={6} wrap="wrap">
              <AppChip checked readOnly variant="light" icon={null}>
                {job.category}
              </AppChip>
              {job.featured ? (
                <StatusBadge tone="alerte">Sponsorisé</StatusBadge>
              ) : null}
            </Group>

            <Text size="sm">
              <Text span fw={700}>
                {formatMoney(job.amount, job.currency)}
              </Text>{' '}
              <Text span c="dimmed">
                {job.payUnit === 'HOUR'
                  ? 'de l’heure'
                  : job.payUnit === 'DAY'
                    ? 'la journée'
                    : 'la mission'}
              </Text>
            </Text>
            <Text size="sm" fw={600}>
              {formatStartAt(job.startAt)} · {job.durationHours} h
            </Text>
            <Text size="sm" fw={600}>
              {job.commune}
              {job.publicLandmark ? ` · ${job.publicLandmark}` : ''}
            </Text>
            <Text size="sm" c="dimmed">
              {job.distanceLabel ?? 'position non partagée'}
            </Text>
            <Text size="sm" c="dimmed">
              {job.placesRemaining} place
              {job.placesRemaining !== 1 ? 's' : ''} restante
              {job.placesRemaining !== 1 ? 's' : ''} sur {job.workersNeeded}
            </Text>

            <Text
              size="sm"
              p="md"
              style={{
                border: `1px solid ${tokens.color.border.subtle}`,
                borderRadius: 12,
                background: tokens.color.surface.card,
                whiteSpace: 'pre-wrap',
              }}
            >
              {job.description}
            </Text>

            <Text size="xs" c="dimmed">
              L’adresse exacte et le téléphone de mission ne sont jamais affichés
              ici.
            </Text>

            {shareMsg ? (
              <AppAlert
                tone={
                  shareMsg.startsWith('Impossible') ? 'error' : 'success'
                }
                title="Partage"
              >
                {shareMsg}
              </AppAlert>
            ) : null}
            {applyMsg ? (
              <AppAlert tone="info" title="Candidature">
                {applyMsg}
              </AppAlert>
            ) : null}

            <Stack gap="sm">
              <Group grow>
                <AppButton
                  variant="default"
                  leftSection={
                    <ShareNetwork size={18} weight="regular" aria-hidden />
                  }
                  onClick={() => void onShare()}
                >
                  Partager
                </AppButton>
                <AppButton
                  variant="default"
                  leftSection={
                    <Copy size={18} weight="regular" aria-hidden />
                  }
                  aria-label="Copier le lien"
                  onClick={() => void onCopyLink()}
                >
                  Copier
                </AppButton>
              </Group>
              {job.applicationsOpen && !isEmployerMode(me) ? (
                <AppButton
                  color="flash"
                  fullWidth
                  loading={busy}
                  onClick={() => void onApply()}
                >
                  Postuler
                </AppButton>
              ) : (
                <AppButton color="flash" fullWidth disabled>
                  {job.applicationsOpen ? 'Postuler' : 'Clos'}
                </AppButton>
              )}
            </Stack>
          </>
        ) : null}
      </Stack>
    </AppShellLayout>
  );
}
