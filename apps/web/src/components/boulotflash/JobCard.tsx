'use client';

import { Paper, Stack, Group, Text, Title } from '@mantine/core';
import { formatMoney, formatStartAt, type PublicJob } from '@/lib/me';
import { tokens } from '@/theme/tokens';
import { AppChip } from './AppChip';
import { JobPostHeader } from './JobPostHeader';
import { StatusBadge } from './StatusBadge';
import { AppButton } from '@/components/feedback';

type JobCardProps = {
  job: PublicJob;
};

/** Carte mission liste — montant / heure / commune ; lien détail public. */
export function JobCard({ job }: JobCardProps) {
  const href = job.sharePath ?? `/missions/${job.id}`;

  return (
    <Paper
      component="article"
      radius="lg"
      p="md"
      withBorder
      style={{
        borderColor: tokens.color.border.subtle,
        background: tokens.color.surface.card,
      }}
    >
      <Stack gap="sm">
        <JobPostHeader job={job} />
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
          <Title order={3} fz={17} fw={700} style={{ lineHeight: 1.3 }}>
            {job.title}
          </Title>
          <Group gap={6} wrap="nowrap">
            {job.featured ? (
              <StatusBadge tone="alerte">Sponsorisé</StatusBadge>
            ) : null}
            <StatusBadge tone={job.applicationsOpen ? 'succes' : 'attente'}>
              {job.applicationsOpen ? 'Publiée' : 'Fermée'}
            </StatusBadge>
          </Group>
        </Group>
        <Group gap="md" wrap="wrap">
          <Text size="sm">
            <Text span fw={700}>
              {formatMoney(job.amount, job.currency)}
            </Text>{' '}
            <Text span c="dimmed" size="sm">
              {job.payUnit === 'HOUR'
                ? 'de l’heure'
                : job.payUnit === 'DAY'
                  ? 'la journée'
                  : 'la mission'}
            </Text>
          </Text>
          <Text size="sm" fw={600}>
            {formatStartAt(job.startAt)}
          </Text>
          <Text size="sm" fw={600}>
            {job.commune}
          </Text>
          {typeof job.placesRemaining === 'number' ? (
            <Text size="sm" c="dimmed">
              {job.placesRemaining} place
              {job.placesRemaining !== 1 ? 's' : ''} restante
              {job.placesRemaining !== 1 ? 's' : ''}
            </Text>
          ) : null}
        </Group>
        <Group gap={6} wrap="wrap">
          <AppChip checked readOnly variant="light" icon={null}>
            {job.category}
          </AppChip>
          {job.publicLandmark ? (
            <AppChip checked readOnly variant="light" icon={null}>
              {job.publicLandmark}
            </AppChip>
          ) : null}
          <AppChip checked readOnly variant="light" icon={null}>
            {job.distanceLabel ?? 'position non partagée'}
          </AppChip>
        </Group>
        <AppButton
          color="flash"
          size="sm"
          fullWidth
          onClick={() => {
            window.location.assign(href);
          }}
        >
          Voir le détail
        </AppButton>
      </Stack>
    </Paper>
  );
}
