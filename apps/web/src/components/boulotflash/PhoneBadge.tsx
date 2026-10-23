'use client';

import { Group, Text } from '@mantine/core';
import { IconPhone } from '@tabler/icons-react';
import { StatusBadge } from './StatusBadge';

type PhoneBadgeProps = {
  phone: string | null | undefined;
  show?: boolean;
};

/** Badge téléphone si le numéro est renseigné (BF-W / étape 11). Pas d’autre badge. */
export function PhoneBadge({ phone, show }: PhoneBadgeProps) {
  if (!show || !phone) return null;
  return (
    <Group gap={6} wrap="nowrap">
      <StatusBadge tone="succes">Téléphone</StatusBadge>
      <Group gap={4} wrap="nowrap">
        <IconPhone size={14} stroke={2} aria-hidden />
        <Text size="sm" fw={600}>
          {phone}
        </Text>
      </Group>
    </Group>
  );
}
