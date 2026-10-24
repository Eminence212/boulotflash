'use client';

import { forwardRef, useState } from 'react';
import { Group, Modal, Stack, Text } from '@mantine/core';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import { AppAlert, AppButton } from '@/components/feedback';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import {
  applicationHint,
  applicationTone,
  canWithdrawApplication,
} from '@/lib/application-status';
import { formatStartAt, timeLeftLabel } from '@/lib/me';
import { tokens } from '@/theme/tokens';

export type MyApplication = {
  id: string;
  status: string;
  statusLabel: string;
  appliedAt: string | null;
  /** Dernière proposition de place ; `expired` est vrai dès l’échéance, même avant le worker. */
  offer?: { id: string; status: string; expiresAt: string; expired: boolean } | null;
};

type MyApplicationCardProps = {
  application: MyApplication;
  /** Réponse du serveur à afficher dans la carte (envoi, retrait, erreur). */
  feedback: { tone: 'success' | 'info' | 'error'; text: string } | null;
  busy: boolean;
  onWithdraw: () => Promise<boolean>;
  onAccept?: () => Promise<void>;
  onDecline?: () => Promise<boolean>;
};

/** Statut de la candidature, en haut de l’offre et dans le flux de la page. */
export const MyApplicationCard = forwardRef<HTMLDivElement, MyApplicationCardProps>(
  function MyApplicationCard({ application, feedback, busy, onWithdraw, onAccept, onDecline }, ref) {
    const [confirming, setConfirming] = useState(false);
    const [confirmingDecline, setConfirmingDecline] = useState(false);
    const offer = application.offer ?? null;
    const offerOpen =
      application.status === 'OFFERED' && offer?.status === 'PENDING' && !offer.expired;
    const offerExpired = !!offer && offer.expired && application.status !== 'ACCEPTED';
    const hint = applicationHint(application.status);
    const justSent = feedback?.tone === 'success';

    async function confirmDecline() {
      const done = (await onDecline?.()) ?? true;
      if (done) setConfirmingDecline(false);
    }

    async function confirmWithdraw() {
      const done = await onWithdraw();
      if (done) setConfirming(false);
    }

    return (
      <Stack
        ref={ref}
        gap="sm"
        p="md"
        style={{
          background: tokens.color.surface.card,
          border: `1px solid ${justSent ? tokens.color.status.succes.fg : tokens.color.border.subtle}`,
          borderRadius: 16,
          scrollMarginTop: 150,
        }}
      >
        {justSent ? (
          <Group gap="xs" wrap="nowrap">
            <IconCircleCheckFilled
              size={22}
              color={tokens.color.status.succes.fg}
              aria-hidden
            />
            <Text fw={700} c={tokens.color.status.succes.fg}>
              {feedback.text}
            </Text>
          </Group>
        ) : null}

        <Group justify="space-between" align="center" wrap="nowrap">
          <Text fw={700}>Votre candidature</Text>
          <StatusBadge tone={applicationTone(application.status)}>
            {application.statusLabel}
          </StatusBadge>
        </Group>

        {application.appliedAt ? (
          <Text size="sm" c="dimmed">
            Envoyée le {formatStartAt(application.appliedAt)}
          </Text>
        ) : null}
        {offerOpen && offer ? (
          <Stack
            gap="sm"
            p="sm"
            style={{
              background: tokens.color.status.attente.bg,
              border: `1px solid ${tokens.color.status.attente.fg}`,
              borderRadius: 12,
            }}
          >
            <Text fw={700}>Une place vous est proposée</Text>
            <Text size="sm">
              Répondez avant le{' '}
              <Text span fw={700}>
                {formatStartAt(offer.expiresAt)}
              </Text>
              {timeLeftLabel(offer.expiresAt) ? ` (${timeLeftLabel(offer.expiresAt)})` : ''}. Sans
              réponse, la place est libérée.
            </Text>
            <Stack gap="xs">
              <AppButton color="flash" fullWidth loading={busy} onClick={() => void onAccept?.()}>
                Accepter la place
              </AppButton>
              <AppButton variant="default" fullWidth disabled={busy} onClick={() => setConfirmingDecline(true)}>
                Décliner
              </AppButton>
            </Stack>
          </Stack>
        ) : offerExpired ? (
          <Text size="sm" fw={600} c={tokens.color.status.refus.fg} role="status">
            Cette proposition a expiré.
          </Text>
        ) : hint ? (
          <Text size="sm">{hint}</Text>
        ) : null}

        {feedback && !justSent ? (
          <AppAlert tone={feedback.tone} title="Candidature">
            {feedback.text}
          </AppAlert>
        ) : null}

        {canWithdrawApplication(application.status) ? (
          <AppButton
            variant="subtle"
            color="red"
            size="compact-sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setConfirming(true)}
          >
            Retirer ma candidature
          </AppButton>
        ) : null}

        <Modal
          opened={confirmingDecline}
          onClose={() => setConfirmingDecline(false)}
          title="Décliner la place ?"
          centered
          radius="lg"
        >
          <Stack gap="md">
            <Text size="sm">
              La place est rendue au recruteur, qui pourra la proposer à quelqu’un d’autre.
            </Text>
            <Group justify="flex-end" gap="sm">
              <AppButton variant="default" onClick={() => setConfirmingDecline(false)}>
                Garder
              </AppButton>
              <AppButton color="red" loading={busy} onClick={() => void confirmDecline()}>
                Décliner
              </AppButton>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={confirming}
          onClose={() => setConfirming(false)}
          title="Retirer votre candidature ?"
          centered
          radius="lg"
        >
          <Stack gap="md">
            <Text size="sm">
              Le retrait est définitif : vous ne pourrez plus postuler à cette
              mission. Il compte toujours dans vos 5 candidatures du jour.
            </Text>
            <Group justify="flex-end" gap="sm">
              <AppButton variant="default" onClick={() => setConfirming(false)}>
                Garder
              </AppButton>
              <AppButton
                color="red"
                loading={busy}
                onClick={() => void confirmWithdraw()}
              >
                Retirer
              </AppButton>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    );
  },
);
