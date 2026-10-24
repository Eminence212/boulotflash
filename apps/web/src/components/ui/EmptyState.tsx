'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button, Stack, Text, ThemeIcon } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import { tokens } from '@/theme/tokens';

type EmptyStateProps = {
  icon: Icon;
  title: string;
  description?: ReactNode;
  /** Prochaine étape utile, jamais une impasse : un lien ou une action sur place. */
  action?: { label: string; href: string } | { label: string; onClick: () => void };
};

/** État vide : ce qui manque, pourquoi, et quoi faire ensuite. */
export function EmptyState({ icon: IconCmp, title, description, action }: EmptyStateProps) {
  return (
    <Stack
      align="center"
      gap="sm"
      py="xl"
      px="md"
      ta="center"
      style={{
        background: tokens.color.surface.card,
        border: `1px dashed ${tokens.color.border.strong}`,
        borderRadius: 16,
      }}
    >
      <ThemeIcon size={48} radius="xl" variant="light" color="flash" aria-hidden>
        <IconCmp size={26} stroke={1.75} />
      </ThemeIcon>
      <Text fw={700}>{title}</Text>
      {description ? (
        <Text size="sm" c="dimmed" maw={360} style={{ lineHeight: 1.5 }}>
          {description}
        </Text>
      ) : null}
      {action && 'href' in action ? (
        <Button component={Link} href={action.href} color="flash" mt={4}>
          {action.label}
        </Button>
      ) : null}
      {action && 'onClick' in action ? (
        <Button variant="light" color="flash" mt={4} onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </Stack>
  );
}
