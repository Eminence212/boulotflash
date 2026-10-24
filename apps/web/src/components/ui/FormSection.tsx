'use client';

import { useId, type ReactNode } from 'react';
import { Stack, Text } from '@mantine/core';
import { tokens } from '@/theme/tokens';

type FormSectionProps = {
  title: string;
  hint?: string;
  /** Carte blanche autour des champs (pages profil) ; sans cadre dans un panneau. */
  framed?: boolean;
  children: ReactNode;
};

/** Groupe de champs titré : la page se lit par blocs plutôt qu’en liste continue. */
export function FormSection({ title, hint, framed = false, children }: FormSectionProps) {
  const headingId = useId();
  return (
    <Stack
      component="section"
      aria-labelledby={headingId}
      gap="sm"
      p={framed ? 'md' : undefined}
      style={
        framed
          ? {
              background: tokens.color.surface.card,
              border: `1px solid ${tokens.color.border.subtle}`,
              borderRadius: 16,
            }
          : undefined
      }
    >
      <Stack gap={2}>
        <Text
          id={headingId}
          component="h2"
          size="xs"
          tt="uppercase"
          fw={700}
          c="dimmed"
          m={0}
          style={{ letterSpacing: '0.04em' }}
        >
          {title}
        </Text>
        {hint ? (
          <Text size="sm" c="dimmed">
            {hint}
          </Text>
        ) : null}
      </Stack>
      {children}
    </Stack>
  );
}
