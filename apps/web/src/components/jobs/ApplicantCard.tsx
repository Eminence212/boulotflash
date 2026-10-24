'use client';

import { Group, Paper, Stack, Text } from '@mantine/core';
import { IconCalendarTime, IconMapPin, IconPhoneCheck } from '@tabler/icons-react';
import { AppButton } from '@/components/feedback';
import { AppChip } from '@/components/boulotflash/AppChip';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { applicationTone } from '@/lib/application-status';
import { formatAvailability, formatStartAt, timeLeftLabel } from '@/lib/me';
import { tokens } from '@/theme/tokens';

export type Applicant = {
  id: string;
  status: string;
  statusLabel: string;
  appliedAt: string;
  message: string | null;
  candidate: {
    displayName: string;
    commune: string | null;
    skills: string[];
    isAvailable: boolean;
    availability: { weekday: number; slot: string }[];
    /** Badge seulement : le numéro n’arrive jamais dans cet écran. */
    phoneBadge: boolean;
  };
  offer: { id: string; status: string; expiresAt: string; expired: boolean } | null;
};

export type ApplicantAction = 'shortlist' | 'reject' | 'offer';

type ApplicantCardProps = {
  applicant: Applicant;
  /** Action en cours sur cette carte (bouton en chargement). */
  busy: ApplicantAction | null;
  /** Une action est en cours sur la page : tous les boutons attendent (double clic, deux cartes). */
  locked: boolean;
  /** Plus aucune place : « Proposer » est désactivé, avec l’explication. */
  noPlaceLeft: boolean;
  onAction: (action: ApplicantAction) => void;
};

function offerLine(offer: NonNullable<Applicant['offer']>): { text: string; color?: string } {
  if (offer.status === 'PENDING' && !offer.expired) {
    const left = timeLeftLabel(offer.expiresAt);
    return {
      text: `Réponse attendue avant ${formatStartAt(offer.expiresAt)}${left ? ` (${left})` : ''}. Une place est réservée.`,
      color: tokens.color.status.attente.fg,
    };
  }
  if (offer.status === 'EXPIRED' || offer.expired) {
    return { text: 'La proposition a expiré. La place est de nouveau libre.' };
  }
  if (offer.status === 'ACCEPTED') {
    return { text: 'Place acceptée : participation confirmée.', color: tokens.color.status.succes.fg };
  }
  if (offer.status === 'DECLINED') return { text: 'Le candidat a décliné la proposition.' };
  return { text: '' };
}

/** Carte candidat côté recruteur : nom d’usage, commune, compétences, disponibilité, badge téléphone (BF-SEL-01). */
export function ApplicantCard({ applicant, busy, locked, noPlaceLeft, onAction }: ApplicantCardProps) {
  const { candidate, offer } = applicant;
  const canDecide = applicant.status === 'SUBMITTED' || applicant.status === 'SHORTLISTED';
  const line = offer ? offerLine(offer) : null;

  return (
    <Paper
      component="article"
      radius="lg"
      p="md"
      withBorder
      aria-label={`${candidate.displayName}, ${applicant.statusLabel}`}
      style={{ borderColor: tokens.color.border.subtle }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={700} style={{ lineHeight: 1.3 }}>
              {candidate.displayName}
            </Text>
            <Text size="xs" c="dimmed">
              Candidature du {formatStartAt(applicant.appliedAt)}
            </Text>
          </Stack>
          <div style={{ flexShrink: 0 }}>
            <StatusBadge tone={applicationTone(applicant.status)}>{applicant.statusLabel}</StatusBadge>
          </div>
        </Group>

        <Stack gap={6}>
          {candidate.commune ? (
            <Group gap={6} wrap="nowrap">
              <IconMapPin size={16} stroke={2} color={tokens.color.brand.inkMuted} aria-hidden />
              <Text size="sm">{candidate.commune}</Text>
            </Group>
          ) : null}
          <Group gap={6} wrap="nowrap" align="flex-start">
            <IconCalendarTime size={16} stroke={2} color={tokens.color.brand.inkMuted} aria-hidden style={{ marginTop: 2 }} />
            <Text size="sm">
              <Text span fw={600} c={candidate.isAvailable ? tokens.color.status.succes.fg : tokens.color.status.refus.fg}>
                {candidate.isAvailable ? 'Disponible' : 'Indisponible'}
              </Text>
              {' · '}
              {formatAvailability(candidate.availability)}
            </Text>
          </Group>
          {candidate.phoneBadge ? (
            <Group gap={6} wrap="nowrap">
              <IconPhoneCheck size={16} stroke={2} color={tokens.color.status.succes.fg} aria-hidden />
              <Text size="sm">Téléphone renseigné · visible après acceptation</Text>
            </Group>
          ) : null}
        </Stack>

        {candidate.skills.length > 0 ? (
          <Group gap={6} wrap="wrap">
            {candidate.skills.map((skill) => (
              <AppChip key={skill} checked readOnly variant="light" icon={null}>
                {skill}
              </AppChip>
            ))}
          </Group>
        ) : null}

        {applicant.message ? (
          <Text
            size="sm"
            p="sm"
            style={{ background: tokens.color.surface.canvas, borderRadius: 12, whiteSpace: 'pre-wrap' }}
          >
            « {applicant.message} »
          </Text>
        ) : null}

        {line?.text ? (
          <Text size="sm" fw={600} c={line.color} role="status">
            {line.text}
          </Text>
        ) : null}

        {canDecide ? (
          <Stack gap="xs">
            <AppButton
              color="flash"
              fullWidth
              loading={busy === 'offer'}
              disabled={locked || noPlaceLeft}
              onClick={() => onAction('offer')}
            >
              Proposer une place
            </AppButton>
            <Group gap="xs" grow wrap="nowrap">
              {applicant.status === 'SUBMITTED' ? (
                <AppButton
                  variant="default"
                  loading={busy === 'shortlist'}
                  disabled={locked}
                  onClick={() => onAction('shortlist')}
                >
                  Présélectionner
                </AppButton>
              ) : null}
              <AppButton
                variant="default"
                c="red"
                loading={busy === 'reject'}
                disabled={locked}
                onClick={() => onAction('reject')}
              >
                Refuser
              </AppButton>
            </Group>
            {noPlaceLeft ? (
              <Text size="xs" c="dimmed">
                Toutes les places sont réservées ou confirmées. Une place se libère si une
                proposition est déclinée ou expire.
              </Text>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
