'use client';

import { Box } from '@mantine/core';
import { tokens } from '@/theme/tokens';

type BrandLogoProps = {
  /** Variante compacte (nav) ou hero (auth / accueil). */
  size?: 'sm' | 'md' | 'lg';
  /** Priorité de chargement pour LCP sur l’écran connexion. */
  priority?: boolean;
};

const WIDTHS = {
  sm: 'clamp(120px, 36vw, 160px)',
  md: 'clamp(180px, 48vw, 240px)',
  lg: 'clamp(220px, 62vw, 320px)',
} as const;

/**
 * Wordmark BoulotFlash — taille responsive (même principe que Logo GO-PASS).
 */
export function BrandLogo({ size = 'md', priority = false }: BrandLogoProps) {
  return (
    <Box
      component="span"
      display="inline-flex"
      style={{ maxWidth: '100%' }}
      aria-label={tokens.copy.brand}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/boulotflash.svg"
        alt={tokens.copy.brand}
        width={720}
        height={160}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        style={{
          width: WIDTHS[size],
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
        }}
      />
    </Box>
  );
}
