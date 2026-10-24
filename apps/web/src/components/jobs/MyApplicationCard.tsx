'use client';

import { forwardRef, useState } from 'react';
import { Group, Modal, Stack, Text } from '@mantine/core';
import { CheckCircle } from '@phosphor-icons/react';
import { AppAlert, AppButton } from '@/components/feedback';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import {
  applicationHint,
  applicationTone,
  canWithdrawApplication,
} from '@/lib/application-status';
import { formatStartAt } from '@/lib/me';
import { tokens } from '@/theme/tokens';

export type MyApplication = {
  id: string;
  status: string;
  statusLabel: string;
  appliedAt: string | null;
};

type MyApplicationCardProps = {
  application: MyApplication;
  /** Réponse du serveur à afficher dans la carte (envoi, retrait, erreur). */
  feedback: { tone: 'success' | 'info' | 'error'; text: string } | null;
  busy: boolean;
  onWithdraw: () => Promise<boolean>;
};

/** Statut de la candidature, en haut de l’offre et dans le flux de la page. */
export const MyApplicationCard = forwardRef<HTMLDivElement, MyApplicationCardProps>(
  function MyApplicationCard({ application, feedback, busy, onWithdraw }, ref) {
    const [confirming, setConfirming] = useState(false);
    const hint = applicationHint(application.status);
    const justSent = feedback?.tone === 'success';

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
            <CheckCircle
              size={22}
              weight="fill"
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
        {hint ? <Text size="sm">{hint}</Text> : null}

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
