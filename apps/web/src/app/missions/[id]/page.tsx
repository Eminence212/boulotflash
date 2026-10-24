'use client';

import { use, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Anchor, Checkbox, Group, Stack, Text, Textarea, Title } from '@mantine/core';
import { Copy, ShareNetwork } from '@phosphor-icons/react';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import { AppChip } from '@/components/boulotflash/AppChip';
import { JobPostHeader } from '@/components/boulotflash/JobPostHeader';
import { MissionDistance } from '@/components/jobs/MissionDistance';
import {
  MyApplicationCard,
  type MyApplication,
} from '@/components/jobs/MyApplicationCard';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { PageActions } from '@/components/layout/PageActions';
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

const PublicMissionMap = dynamic(
  () =>
    import('@/components/jobs/PublicMissionMap').then(
      (mod) => mod.PublicMissionMap,
    ),
  { ssr: false },
);

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
  const [applyError, setApplyError] = useState<string | null>(null);
  const [cardFeedback, setCardFeedback] = useState<{
    tone: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmAvailable, setConfirmAvailable] = useState(false);
  const [note, setNote] = useState('');
  const [mine, setMine] = useState<MyApplication | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Après l’envoi, la confirmation doit être sous les yeux, pas sous la barre.
  useEffect(() => {
    if (cardFeedback?.tone !== 'success') return;
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [cardFeedback]);

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

  function fetchMine(token: string) {
    return apiFetch<{ application: MyApplication | null }>(
      `/jobs/${id}/my-application`,
      { accessToken: token },
    );
  }

  useEffect(() => {
    const token = readAccessToken();
    if (!token) {
      setMine(null);
      return;
    }
    let cancelled = false;
    void fetchMine(token).then(({ data }) => {
      if (cancelled) return;
      setMine(data.application ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [id, me?.id]);

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
    if (!confirmAvailable || mine) return;
    setApplyError(null);
    setCardFeedback(null);
    const token = readAccessToken();
    if (!token) {
      window.location.assign(`/connexion?next=/missions/${id}`);
      return;
    }
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setBusy(true);
    try {
      const { status, data } = await apiFetch<{
        message?: string;
        code?: string;
        id?: string;
        status?: string;
      }>(`/jobs/${id}/applications`, {
        method: 'POST',
        accessToken: token,
        headers: { 'Idempotency-Key': idempotencyKey.current },
        body: {
          availabilityConfirmed: true,
          message: note.trim() || undefined,
        },
      });
      if (status === 201) {
        idempotencyKey.current = null;
        const { data: current } = await fetchMine(token).catch(() => ({
          data: { application: null },
        }));
        setMine(
          current.application ?? {
            id: data.id ?? '',
            status: data.status ?? 'SUBMITTED',
            statusLabel: 'Soumise',
            appliedAt: new Date().toISOString(),
          },
        );
        setCardFeedback({
          tone: 'success',
          text: data.message ?? 'Candidature envoyée',
        });
        return;
      }
      if (data.code === 'ALREADY_APPLIED') {
        // Statut réel (ex. « Retirée ») plutôt qu’un « Soumise » supposé.
        const { data: current } = await fetchMine(token);
        if (current.application) {
          setMine(current.application);
          setCardFeedback({
            tone: 'info',
            text: data.message ?? 'Vous avez déjà postulé à cette mission.',
          });
          return;
        }
      }
      setApplyError(data.message ?? 'Candidature impossible.');
    } catch {
      setApplyError('Non envoyé. Vérifiez votre connexion puis réessayez.');
    } finally {
      setBusy(false);
    }
  }

  async function onWithdraw(): Promise<boolean> {
    if (!mine?.id) return false;
    const token = readAccessToken();
    if (!token) return false;
    setBusy(true);
    setCardFeedback(null);
    try {
      const { status, data } = await apiFetch<{
        message?: string;
        status?: string;
        statusLabel?: string;
      }>(`/applications/${mine.id}/withdraw`, {
        method: 'POST',
        accessToken: token,
      });
      if (status >= 400) {
        setCardFeedback({
          tone: 'error',
          text: data.message ?? 'Retrait impossible.',
        });
        return true;
      }
      setMine({
        ...mine,
        status: data.status ?? 'WITHDRAWN',
        statusLabel: data.statusLabel ?? 'Retirée',
      });
      // Le badge « Retirée » et l’explication de la carte suffisent.
      return true;
    } catch {
      setCardFeedback({
        tone: 'error',
        text: 'Non envoyé. Vérifiez votre connexion puis réessayez.',
      });
      return true;
    } finally {
      setBusy(false);
    }
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

            {mine ? (
              <MyApplicationCard
                ref={cardRef}
                application={mine}
                feedback={cardFeedback}
                busy={busy}
                onWithdraw={onWithdraw}
              />
            ) : null}

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
            <PublicMissionMap
              publicLatitude={job.publicLatitude}
              publicLongitude={job.publicLongitude}
              landmark={job.publicLandmark}
            />
            <MissionDistance
              latitude={job.publicLatitude}
              longitude={job.publicLongitude}
            />
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
              {mine ? null : job.applicationsOpen && !isEmployerMode(me) ? (
                <>
                  <Textarea
                    label="Message au recruteur"
                    description="Facultatif · 500 caractères au plus"
                    maxLength={500}
                    value={note}
                    onChange={(event) => setNote(event.currentTarget.value)}
                    autosize
                    minRows={2}
                  />
                  <PageActions>
                    <Stack gap="xs">
                      {applyError ? (
                        <Text size="sm" fw={600} c={tokens.color.semantic.danger} role="alert">
                          {applyError}
                        </Text>
                      ) : null}
                      <Checkbox
                        checked={confirmAvailable}
                        onChange={(event) =>
                          setConfirmAvailable(event.currentTarget.checked)
                        }
                        label="Je confirme être disponible pour cette mission"
                      />
                      <AppButton
                        color="flash"
                        fullWidth
                        loading={busy}
                        disabled={!confirmAvailable}
                        onClick={() => void onApply()}
                      >
                        Postuler
                      </AppButton>
                    </Stack>
                  </PageActions>
                </>
              ) : (
                <PageActions>
                  <AppButton color="flash" fullWidth disabled>
                    {job.applicationsOpen ? 'Postuler' : 'Clos'}
                  </AppButton>
                </PageActions>
              )}
            </Stack>
          </>
        ) : null}
      </Stack>
    </AppShellLayout>
  );
}
