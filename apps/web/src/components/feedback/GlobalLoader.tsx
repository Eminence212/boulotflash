'use client';

import { Loader, Stack, Text } from '@mantine/core';
import { BrandLogo } from '@/components/brand';
import { tokens } from '@/theme/tokens';

type GlobalLoaderProps = {
  /** Overlay fixe plein écran (transitions / redirect). */
  fullscreen?: boolean;
  message?: string;
};

/**
 * Loader global style stockgopass : logo + anneaux + message.
 */
export function GlobalLoader({
  fullscreen = false,
  message = 'Chargement en cours…',
}: GlobalLoaderProps) {
  return (
    <div
      className={
        fullscreen ? 'bf-global-loader bf-global-loader-full' : 'bf-global-loader'
      }
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="bf-global-loader-glow bf-global-loader-glow-left" aria-hidden />
      <span className="bf-global-loader-glow bf-global-loader-glow-right" aria-hidden />
      <Stack align="center" gap="sm" className="bf-global-loader-card">
        <div className="bf-global-loader-logo">
          <BrandLogo size="sm" />
        </div>
        <div className="bf-global-loader-orbit" aria-hidden>
          <span className="bf-global-loader-ring bf-global-loader-ring-a" />
          <span className="bf-global-loader-ring bf-global-loader-ring-b" />
          <Loader size="sm" color="flash" />
        </div>
        <Text size="sm" fw={700} style={{ fontFamily: 'var(--font-display)' }}>
          {tokens.copy.brand}
        </Text>
        <Text size="xs" c="dimmed" ta="center">
          {message}
        </Text>
        <div className="bf-global-loader-progress" aria-hidden>
          <span />
        </div>
      </Stack>
    </div>
  );
}
