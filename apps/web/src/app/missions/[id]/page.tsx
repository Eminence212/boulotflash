'use client';

import { use, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Checkbox, Group, Stack, Text, Textarea, Title } from '@mantine/core';
import { IconCopy, IconShare } from '@tabler/icons-react';
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
import { BackLink } from '@/components/ui/BackLink';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import {
  formatMoney,
  formatStartAt,
  isEmployerMode,
  payUnitLabel,
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
  // Une clé par réponse à la proposition : double clic et nouvel essai rejouent la même demande.
  const answerKeys = useRef(new Map<string, string>());
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

  /** Places restantes à jour après une réponse à la proposition. */
  async function reloadJob() {
    const { status, data } = await apiFetch<PublicDetail>(`/jobs/${id}`);
    if (status < 400) setJob(data as PublicDetail);
  }

  async function answerOffer(answer: 'accept' | 'decline'): Promise<boolean> {
    const offer = mine?.offer;
    const token = readAccessToken();
    if (!offer || !token || busy) return false;
    const slot = `${answer}:${offer.id}`;
    const key = answerKeys.current.get(slot) ?? crypto.randomUUID();
    answerKeys.current.set(slot, key);
    setBusy(true);
    setCardFeedback(null);
    try {
      const { status, data } = await apiFetch<{ code?: string; message?: string }>(
        `/selection-offers/${offer.id}/${answer}`,
        { method: 'POST', accessToken: token, headers: { 'Idempotency-Key': key } },
      );
      answerKeys.current.delete(slot);
      // Expiration et déclin : la carte affiche déjà le statut et son explication, pas de second message.
      if (status >= 400 && data.code !== 'PROPOSAL_EXPIRED') {
        setCardFeedback({ tone: 'error', text: data.message ?? 'Réponse impossible.' });
      } else if (status < 400 && answer === 'accept') {
        setCardFeedback({ tone: 'success', text: 'Votre place est confirmée.' });
      }
      const { data: current } = await fetchMine(token);
      setMine(current.application ?? null);
      await reloadJob();
      return true;
    } catch {
      // La clé est gardée : le prochain essai rejoue la même demande sans doublon.
      setCardFeedback({ tone: 'error', text: 'Non envoyé. Vérifiez votre connexion puis réessayez.' });
      return false;
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
    >
      <Stack gap="md">
        <BackLink href="/" label="Toutes les missions" />

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
                onAccept={async () => {
                  await answerOffer('accept');
                }}
                onDecline={() => answerOffer('decline')}
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
                {payUnitLabel(job.payUnit)}
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
                    <IconShare size={18} stroke={2} aria-hidden />
                  }
                  onClick={() => void onShare()}
                >
                  Partager
                </AppButton>
                <AppButton
                  variant="default"
                  leftSection={
                    <IconCopy size={18} stroke={2} aria-hidden />
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
