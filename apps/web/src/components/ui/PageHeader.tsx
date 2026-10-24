'use client';

import type { ReactNode } from 'react';
import { Group, Stack, Text, Title } from '@mantine/core';
import { BackLink } from './BackLink';

type PageHeaderProps = {
  title: ReactNode;
  /** Une phrase : à quoi sert la page, ou l’état utile (abonnement, nombre…). */
  description?: ReactNode;
  back?: { href: string; label: string };
  /** Action principale de la page, alignée à droite du titre. */
  actions?: ReactNode;
};

/** En-tête de page : un seul titre de niveau 1, même taille partout. */
export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
  return (
    <Stack gap={6}>
      {back ? <BackLink href={back.href} label={back.label} /> : null}
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Title order={1} fz={{ base: 24, sm: 28 }} fw={800} style={{ lineHeight: 1.2, minWidth: 0 }}>
          {title}
        </Title>
        {actions ? <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>{actions}</Group> : null}
      </Group>
      {description ? (
        <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}
