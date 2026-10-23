'use client';

import { Button, type ButtonProps } from '@mantine/core';

export type AppButtonProps = ButtonProps &
  Omit<React.ComponentPropsWithoutRef<'button'>, keyof ButtonProps>;

/**
 * Bouton réutilisable — loader Mantine `dots` dès que `loading` est vrai.
 * `loaderProps` du caller est fusionné (type dots reste la base).
 */
export function AppButton({ loaderProps, ...props }: AppButtonProps) {
  return (
    <Button
      {...props}
      loaderProps={{ type: 'dots', ...loaderProps }}
    />
  );
}
