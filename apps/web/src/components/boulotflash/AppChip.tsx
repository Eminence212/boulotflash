'use client';

import { Chip, type ChipProps } from '@mantine/core';

export type AppChipProps = Omit<ChipProps, 'variant' | 'size' | 'radius'> & {
  variant?: ChipProps['variant'];
  size?: ChipProps['size'];
  radius?: ChipProps['radius'];
};

/**
 * Chip Mantine réutilisable — outline / xs / radius lg par défaut, couleur primaire du thème.
 * Filtres : `variant="outline"`. Cartes mission : `variant="light"`.
 * Affichage seul : `checked` + `readOnly`.
 * Filtre dismissible : `checked` + `onChange`.
 */
export function AppChip({
  variant = 'outline',
  size = 'xs',
  radius = 'lg',
  children,
  ...rest
}: AppChipProps) {
  return (
    <Chip variant={variant} size={size} radius={radius} {...rest}>
      {children}
    </Chip>
  );
}
