'use client';

import { Group, Stack, Text } from '@mantine/core';
import { CheckCircle, Circle, HourglassMedium } from '@phosphor-icons/react';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { jobStatusLabel, jobStatusTone } from '@/lib/job-status';
import { tokens } from '@/theme/tokens';

type JobStatusNoticeProps = {
  status: string;
  /** Raisons connues côté écran (catégorie sensible, domicile privé). */
  reviewReasons: string[];
};

const LOCKED_HINTS: Record<string, string> = {
  FILLED: 'Toutes les places sont pourvues. L’offre ne se modifie plus.',
  EXPIRED: 'La date limite est passée. Republiez-la pour une nouvelle date.',
  CANCELLED: 'Offre annulée. Republiez-la pour la proposer de nouveau.',
  SUSPENDED: 'Offre suspendue par l’équipe BoulotFlash. Contactez le support.',
  COMPLETED: 'Mission terminée.',
};

function Step({ state, label }: { state: 'done' | 'current' | 'next'; label: string }) {
  const color =
    state === 'done'
      ? tokens.color.status.succes.fg
      : state === 'current'
        ? tokens.color.status.attente.fg
        : tokens.color.border.strong;
  const Icon = state === 'done' ? CheckCircle : state === 'current' ? HourglassMedium : Circle;
  return (
    <Group gap={8} wrap="nowrap">
      <Icon size={20} weight={state === 'next' ? 'regular' : 'fill'} color={color} aria-hidden />
      <Text
        size="sm"
        fw={state === 'current' ? 700 : 500}
        c={state === 'next' ? 'dimmed' : undefined}
      >
        {label}
      </Text>
    </Group>
  );
}

/** Statut d’une offre verrouillée, en tête du formulaire : où elle en est et ce qui suit. */
export function JobStatusNotice({ status, reviewReasons }: JobStatusNoticeProps) {
  const inReview = status === 'IN_REVIEW';

  return (
    <Stack
      gap="sm"
      p="md"
      style={{
        background: inReview ? tokens.color.status.attente.bg : tokens.color.surface.canvas,
        border: `1px solid ${inReview ? tokens.color.status.attente.fg : tokens.color.border.subtle}`,
        borderRadius: 16,
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Text fw={700}>
          {inReview ? 'Vérification en cours' : 'Offre non modifiable'}
        </Text>
        <StatusBadge tone={jobStatusTone(status)}>{jobStatusLabel(status)}</StatusBadge>
      </Group>

      {inReview ? (
        <>
          <Stack gap={6}>
            <Step state="done" label="Offre envoyée" />
            <Step state="current" label="Vérification par l’équipe BoulotFlash" />
            <Step state="next" label="Publiée et visible des candidats" />
          </Stack>
          <Text size="sm">
            Vous n’avez rien à faire. Un membre de l’équipe valide l’offre ou la
            refuse avec un motif. Si elle est refusée, le motif s’affichera ici
            et vous pourrez la corriger puis la renvoyer.
          </Text>
          <Text size="sm" c="dimmed">
            Pourquoi une vérification :{' '}
            {reviewReasons.length > 0
              ? reviewReasons.join(' ; ')
              : 'première offre de votre compte, ou modification importante d’une offre publiée'}
            . Pendant ce temps, l’offre n’est pas modifiable et ne reçoit pas de
            candidature.
          </Text>
        </>
      ) : (
        <Text size="sm">
          {LOCKED_HINTS[status] ?? 'Cette offre ne peut pas être modifiée dans son état actuel.'}
        </Text>
      )}
    </Stack>
  );
}

/** Ce que l’écran sait déjà de la règle de modération (la première offre reste côté serveur). */
export function reviewReasonsFor(
  category: { isSensitive?: boolean; sensitiveIfHome?: boolean } | undefined,
  atPrivateHome: boolean,
): string[] {
  const reasons: string[] = [];
  if (category?.isSensitive) reasons.push('catégorie vérifiée systématiquement');
  if (category?.sensitiveIfHome && atPrivateHome) {
    reasons.push('mission au domicile privé dans cette catégorie');
  }
  return reasons;
}
