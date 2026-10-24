'use client';

import { Badge } from '@mantine/core';
import { mantineStatusColors, tokens } from '@/theme/tokens';

type Tone = keyof typeof mantineStatusColors | 'soft';

const SOFT = { fg: tokens.color.brand.navySoft, bg: tokens.color.brand.flashSoft };

type StatusBadgeProps = {
  tone?: Tone;
  children: string;
};

/** Badge de statut — toujours un libellé texte (pas seulement une couleur). */
export function StatusBadge({ tone = 'soft', children }: StatusBadgeProps) {
  const colors = tone === 'soft' ? SOFT : mantineStatusColors[tone];
  return (
    <Badge
      radius="xl"
      size="sm"
      style={{
        background: colors.bg,
        color: colors.fg,
        textTransform: 'none',
        fontWeight: 600,
        // Un statut se lit en entier : le badge ne rétrécit jamais à côté d’un titre long.
        flexShrink: 0,
        overflow: 'visible',
      }}
    >
      {children}
    </Badge>
  );
}
