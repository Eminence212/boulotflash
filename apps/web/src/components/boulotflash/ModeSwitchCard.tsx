'use client';

import { Stack, Text } from '@mantine/core';
import { tokens } from '@/theme/tokens';
import type { MeResponse } from '@/lib/me';
import { ModeSwitcher } from './ModeSwitcher';

type ModeSwitchCardProps = {
  me: MeResponse;
  onChanged: (mode: 'WORKER' | 'EMPLOYER') => void;
};

/** Choix du mode d’utilisation, sur la page profil. Visible seulement si les deux profils existent. */
export function ModeSwitchCard({ me, onChanged }: ModeSwitchCardProps) {
  if (!me.modesAvailable.canSwitch) return null;
  return (
    <Stack
      component="section"
      aria-labelledby="bf-mode-title"
      gap="sm"
      p="md"
      style={{
        background: tokens.color.surface.card,
        border: `1px solid ${tokens.color.border.subtle}`,
        borderRadius: 16,
      }}
    >
      <Stack gap={2}>
        <Text
          id="bf-mode-title"
          component="h2"
          size="xs"
          tt="uppercase"
          fw={700}
          c="dimmed"
          m={0}
          style={{ letterSpacing: '0.04em' }}
        >
          Mode d’utilisation
        </Text>
        <Text size="sm" c="dimmed">
          Candidat pour chercher des missions et postuler, recruteur pour publier et choisir.
        </Text>
      </Stack>
      <ModeSwitcher me={me} onChanged={onChanged} fullWidth />
    </Stack>
  );
}
