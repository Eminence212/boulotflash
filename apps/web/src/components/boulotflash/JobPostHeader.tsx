'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Anchor, Avatar, Box, Group, Text } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { detailViewLabel, formatPublishedAgo } from '@/lib/published-ago';
import type { PublicJob } from '@/lib/me';
import { tokens } from '@/theme/tokens';

function PublishedAgo({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer = 0;
    const arm = () => {
      const age = Date.now() - new Date(iso).getTime();
      const delay = age < 60_000 ? 1000 : age < 3_600_000 ? 30_000 : 60_000;
      timer = window.setTimeout(() => {
        setNow(Date.now());
        arm();
      }, delay);
    };
    arm();
    return () => window.clearTimeout(timer);
  }, [iso]);

  const label = formatPublishedAgo(iso, now);
  if (!label) return null;
  return <time dateTime={iso}>{label}</time>;
}

/** En-tête type post : photo, nom, temps depuis la publication, vues du détail. */
export function JobPostHeader({ job }: { job: PublicJob }) {
  const publisher = job.publisher;
  const hasViews = typeof job.detailViewCount === 'number';
  if (!publisher && !job.publishedAt && !hasViews) return null;

  const name = publisher?.name?.trim() || 'Recruteur';
  const initial = name.charAt(0).toUpperCase() || 'R';
  const profilePath = publisher?.profilePath ?? null;
  const views = job.detailViewCount ?? 0;

  const avatar = (
    <Avatar
      src={publisher?.avatarUrl || undefined}
      radius="xl"
      size={40}
      color="flash"
      variant="light"
      alt=""
    >
      {initial}
    </Avatar>
  );

  const nameNode = (
    <Text component="span" fw={700} size="sm" lineClamp={1}>
      {name}
    </Text>
  );

  const identity = (
    <Group wrap="nowrap" align="center" gap={10} style={{ minWidth: 0 }}>
      {avatar}
      {nameNode}
    </Group>
  );

  return (
    <Box>
      {profilePath ? (
        <Anchor
          component={Link}
          href={profilePath}
          aria-label={`Profil de ${name}`}
          underline="never"
          c="inherit"
          styles={{
            root: {
              textDecoration: 'none',
              '&:hover, &:focus': {
                textDecoration: 'none',
              },
            },
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 44,
            maxWidth: '100%',
            borderRadius: 8,
          }}
        >
          {identity}
        </Anchor>
      ) : (
        identity
      )}
      {job.publishedAt || hasViews ? (
        <Group gap={8} wrap="wrap" align="center" mt={2} ml={50}>
          {job.publishedAt ? (
            <Text size="xs" c="dimmed" lh={1.4}>
              <PublishedAgo iso={job.publishedAt} />
            </Text>
          ) : null}
          {hasViews ? (
            <Group gap={4} wrap="nowrap" align="center">
              <IconEye
                size={14}
                stroke={1.75}
                aria-hidden
                color={tokens.color.brand.inkMuted}
              />
              <Text size="xs" c="dimmed" lh={1.4}>
                {detailViewLabel(views)}
              </Text>
            </Group>
          ) : null}
        </Group>
      ) : null}
    </Box>
  );
}
