'use client';

import Link from 'next/link';
import { Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconClock, IconMapPin, IconRoute } from '@tabler/icons-react';
import { formatMoney, formatStartAt, payUnitLabel, type PublicJob } from '@/lib/me';
import { tokens } from '@/theme/tokens';
import { AppChip } from './AppChip';
import { JobPostHeader } from './JobPostHeader';
import { StatusBadge } from './StatusBadge';

type JobCardProps = {
  job: PublicJob;
};

function Fact({ icon: IconCmp, children }: { icon: typeof IconClock; children: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <IconCmp size={16} stroke={2} color={tokens.color.brand.inkMuted} aria-hidden />
      <Text size="sm" fw={600}>
        {children}
      </Text>
    </Group>
  );
}

/** Carte mission liste : montant, heure et commune en texte ; un vrai lien vers le détail. */
export function JobCard({ job }: JobCardProps) {
  const href = job.sharePath ?? `/missions/${job.id}`;
  const places =
    typeof job.placesRemaining === 'number'
      ? `${job.placesRemaining} place${job.placesRemaining !== 1 ? 's' : ''} restante${job.placesRemaining !== 1 ? 's' : ''}`
      : null;

  return (
    <Paper
      component="article"
      radius="lg"
      p="md"
      withBorder
      className="bf-card-hover"
      style={{
        borderColor: tokens.color.border.subtle,
        background: tokens.color.surface.card,
      }}
    >
      <Stack gap="sm">
        <JobPostHeader job={job} />
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
          <Title order={3} fz={18} fw={700} style={{ lineHeight: 1.3 }}>
            {job.title}
          </Title>
          {/* La liste publique ne montre que des offres ouvertes : seul l’écart mérite un badge. */}
          {job.featured || !job.applicationsOpen ? (
            <Group gap={6} wrap="nowrap">
              {job.featured ? <StatusBadge tone="alerte">Sponsorisé</StatusBadge> : null}
              {!job.applicationsOpen ? <StatusBadge tone="attente">Fermée</StatusBadge> : null}
            </Group>
          ) : null}
        </Group>

        <Text size="md">
          <Text span fw={800} fz="lg">
            {formatMoney(job.amount, job.currency)}
          </Text>{' '}
          <Text span c="dimmed" size="sm">
            {payUnitLabel(job.payUnit)}
          </Text>
        </Text>

        <Stack gap={6}>
          <Fact icon={IconClock}>{formatStartAt(job.startAt)}</Fact>
          <Fact icon={IconMapPin}>
            {job.publicLandmark ? `${job.commune} · ${job.publicLandmark}` : job.commune}
          </Fact>
          {job.distanceLabel ? <Fact icon={IconRoute}>{job.distanceLabel}</Fact> : null}
        </Stack>

        <Group gap={6} wrap="wrap" justify="space-between">
          <AppChip checked readOnly variant="light" icon={null}>
            {job.category}
          </AppChip>
          {places ? (
            <Text size="sm" c="dimmed">
              {places}
            </Text>
          ) : null}
        </Group>

        <Button component={Link} href={href} variant="light" color="flash" fullWidth>
          Voir la mission
        </Button>
      </Stack>
    </Paper>
  );
}
