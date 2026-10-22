'use client';

import { Button, type ButtonProps } from '@mantine/core';

export type AppButtonProps = ButtonProps &
  React.ComponentPropsWithoutRef<'button'>;

const DEFAULT_LOADER_PROPS = { type: 'dots' as const };

/**
 * Bouton réutilisable — loader Mantine `dots` quand `loading`.
 */
export function AppButton({
  loaderProps,
  ...props
}: AppButtonProps) {
  return (
    <Button
      loaderProps={{ ...DEFAULT_LOADER_PROPS, ...loaderProps }}
      {...props}
    />
  );
}
