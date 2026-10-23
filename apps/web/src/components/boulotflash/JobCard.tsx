'use client';

import { Paper, Stack, Group, Text, Title } from '@mantine/core';
import { formatMoney, formatStartAt, type PublicJob } from '@/lib/me';
import { tokens } from '@/theme/tokens';
import { StatusBadge } from './StatusBadge';

type JobCardProps = {
  job: PublicJob;
};

/** Carte mission liste — montant / heure / commune en texte. */
export function JobCard({ job }: JobCardProps) {
  return (
    <Paper
      component="article"
      radius="lg"
      p="md"
      withBorder
      style={{ borderColor: tokens.color.border.subtle, background: tokens.color.surface.card }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
          <Title order={3} fz={17} fw={700} style={{ lineHeight: 1.3 }}>
            {job.title}
          </Title>
          <StatusBadge tone={job.applicationsOpen ? 'succes' : 'attente'}>
            {job.applicationsOpen ? 'Publiée' : 'Fermée'}
          </StatusBadge>
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
        </Group>
        <Group gap="xs">
          <StatusBadge tone="soft">{job.category}</StatusBadge>
          {job.publicLandmark ? (
            <StatusBadge tone="soft">{job.publicLandmark}</StatusBadge>
          ) : null}
        </Group>
      </Stack>
    </Paper>
  );
}
