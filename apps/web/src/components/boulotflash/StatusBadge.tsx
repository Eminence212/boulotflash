'use client';

import { Badge } from '@mantine/core';
import { mantineStatusColors } from '@/theme/tokens';

type Tone = keyof typeof mantineStatusColors | 'soft';

const SOFT = { fg: '#1A3358', bg: '#E8F4FF' };

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
      }}
    >
      {children}
    </Badge>
  );
}
