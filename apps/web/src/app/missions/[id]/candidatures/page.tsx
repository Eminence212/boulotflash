'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { Group, Modal, Paper, Stack, Text } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import {
  ApplicantCard,
  type Applicant,
  type ApplicantAction,
} from '@/components/jobs/ApplicantCard';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import { jobStatusTone } from '@/lib/job-status';
import { formatStartAt } from '@/lib/me';
import { tokens } from '@/theme/tokens';

type JobSummary = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  workersNeeded: number;
  occupied: number;
  placesRemaining: number;
  selectionDeadline: string;
};

type Feedback = { tone: 'success' | 'info' | 'error'; text: string };

const CONFIRM_COPY: Record<'offer' | 'reject', { title: string; body: string; cta: string }> = {
  offer: {
    title: 'Proposer une place ?',
    body: 'Une place est réservée tout de suite. Le candidat a 2 heures pour accepter, sans dépasser la clôture des sélections. Sans réponse, la place se libère.',
    cta: 'Proposer la place',
  },
  reject: {
    title: 'Refuser cette candidature ?',
    body: 'Le candidat est prévenu dans l’application. Ce refus est définitif pour cette mission.',
    cta: 'Refuser',
  },
};

export default function JobApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, loading, refresh } = useMe({ requireAuth: true });
  const [job, setJob] = useState<JobSummary | null>(null);
  const [items, setItems] = useState<Applicant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState<{ id: string; action: ApplicantAction } | null>(null);
  const [confirm, setConfirm] = useState<{ applicant: Applicant; action: 'offer' | 'reject' } | null>(null);
  // Une clé par proposition tentée : un nouvel essai après coupure réseau rejoue la même demande.
  const offerKeys = useRef(new Map<string, string>());

  const load = useCallback(async () => {
    const token = readAccessToken();
    if (!token) return;
    const { status, data } = await apiFetch<{ job: JobSummary; items: Applicant[]; message?: string }>(
      `/jobs/${id}/applications`,
      { accessToken: token },
    );
    if (status >= 400) {
      setError(status === 404 ? 'Offre introuvable.' : (data.message ?? 'Candidatures indisponibles.'));
      setItems([]);
      return;
    }
    setError(null);
    setJob(data.job);
    setItems(data.items);
  }, [id]);

  useEffect(() => {
    if (loading) return;
    void load();
  }, [loading, load]);

  async function run(applicant: Applicant, action: ApplicantAction) {
    const token = readAccessToken();
    if (!token || busy) return;
    setBusy({ id: applicant.id, action });
    setFeedback(null);
    try {
      let headers: Record<string, string> | undefined;
      if (action === 'offer') {
        const key = offerKeys.current.get(applicant.id) ?? crypto.randomUUID();
        offerKeys.current.set(applicant.id, key);
        headers = { 'Idempotency-Key': key };
      }
      const { status, data } = await apiFetch<{ message?: string; code?: string; expiresAt?: string }>(
        `/applications/${applicant.id}/${action}`,
        { method: 'POST', accessToken: token, headers },
      );
      if (status >= 400) {
        setFeedback({ tone: 'error', text: data.message ?? 'Action impossible.' });
        if (action === 'offer') offerKeys.current.delete(applicant.id);
      } else if (action === 'offer') {
        offerKeys.current.delete(applicant.id);
        setFeedback({
          tone: 'success',
          text: `Place proposée à ${applicant.candidate.displayName}. Réponse attendue avant ${data.expiresAt ? formatStartAt(data.expiresAt) : 'l’échéance'}.`,
        });
      } else if (action === 'shortlist') {
        setFeedback({ tone: 'success', text: `${applicant.candidate.displayName} est présélectionné. Aucune place n’est réservée.` });
      } else {
        setFeedback({ tone: 'info', text: `Candidature de ${applicant.candidate.displayName} refusée.` });
      }
    } catch {
      setFeedback({ tone: 'error', text: 'Non envoyé. Vérifiez votre connexion puis réessayez.' });
    } finally {
      setBusy(null);
      setConfirm(null);
      await load();
    }
  }

  function onAction(applicant: Applicant, action: ApplicantAction) {
    if (action === 'shortlist') {
      void run(applicant, action);
      return;
    }
    setConfirm({ applicant, action });
  }

  if (loading || !me || items === null) {
    return <GlobalLoader fullscreen />;
  }

  const noPlaceLeft = !job || job.placesRemaining <= 0 || job.status !== 'PUBLISHED';

  return (
    <AppShellLayout me={me}>
      <Stack gap="md">
        <PageHeader
          back={{ href: '/missions', label: 'Mes missions' }}
          title="Candidatures"
          description={job?.title}
        />

        {error ? (
          <AppAlert tone="error" title="Candidatures">
            {error}
          </AppAlert>
        ) : null}

        {job ? (
          <Paper
            radius="lg"
            p="md"
            withBorder
            style={{ borderColor: tokens.color.border.subtle }}
            aria-live="polite"
          >
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Stack gap={2}>
                <Text fw={800} fz="xl">
                  {job.placesRemaining} place{job.placesRemaining !== 1 ? 's' : ''} libre
                  {job.placesRemaining !== 1 ? 's' : ''} sur {job.workersNeeded}
                </Text>
                <Text size="sm" c="dimmed">
                  Clôture des sélections : {formatStartAt(job.selectionDeadline)}
                </Text>
              </Stack>
              <div style={{ flexShrink: 0 }}>
                <StatusBadge tone={jobStatusTone(job.status)}>{job.statusLabel}</StatusBadge>
              </div>
            </Group>
          </Paper>
        ) : null}

        {feedback ? (
          <AppAlert tone={feedback.tone} title="Sélection" role={feedback.tone === 'error' ? 'alert' : 'status'}>
            {feedback.text}
          </AppAlert>
        ) : null}

        {!error && items.length === 0 ? (
          <EmptyState
            icon={IconUsers}
            title="Aucune candidature pour l’instant"
            description="Les candidatures apparaîtront ici. Partagez l’offre pour la faire connaître."
            action={{ label: 'Voir l’offre publique', href: `/missions/${id}` }}
          />
        ) : null}

        <Stack component="ul" gap="sm" p={0} m={0} style={{ listStyle: 'none' }}>
          {items.map((applicant) => (
            <li key={applicant.id}>
              <ApplicantCard
                applicant={applicant}
                busy={busy?.id === applicant.id ? busy.action : null}
                locked={busy !== null || confirm !== null}
                noPlaceLeft={noPlaceLeft}
                onAction={(action) => onAction(applicant, action)}
              />
            </li>
          ))}
        </Stack>
      </Stack>

      <Modal
        opened={confirm !== null}
        onClose={() => (busy ? undefined : setConfirm(null))}
        title={confirm ? CONFIRM_COPY[confirm.action].title : ''}
        centered
        radius="lg"
      >
        {confirm ? (
          <Stack gap="md">
            <Text size="sm">
              <Text span fw={700}>
                {confirm.applicant.candidate.displayName}
              </Text>{' '}
              — {CONFIRM_COPY[confirm.action].body}
            </Text>
            <Group justify="flex-end" gap="sm">
              <AppButton variant="default" disabled={!!busy} onClick={() => setConfirm(null)}>
                Annuler
              </AppButton>
              <AppButton
                color={confirm.action === 'reject' ? 'red' : 'flash'}
                loading={!!busy}
                onClick={() => void run(confirm.applicant, confirm.action)}
              >
                {CONFIRM_COPY[confirm.action].cta}
              </AppButton>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </AppShellLayout>
  );
}
