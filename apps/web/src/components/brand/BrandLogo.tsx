'use client';

import Link from 'next/link';
import { Box, UnstyledButton } from '@mantine/core';
import { tokens } from '@/theme/tokens';

export type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl';

type BrandLogoProps = {
  /**
   * Taille responsive du wordmark.
   * - sm : barre compacte
   * - md : pages secondaires
   * - lg / xl : auth / hero
   */
  size?: BrandLogoSize;
  /** Priorité LCP (écran connexion / accueil). */
  priority?: boolean;
  /** Lien optionnel (ex. vers `/` ou `/connexion`). */
  href?: string;
  /** Centrer le logo dans son conteneur (même largeur que le formulaire). */
  centered?: boolean;
};

/** Largeurs visibles — calées sur le viewBox recadré (~488×116). */
const WIDTHS: Record<BrandLogoSize, string> = {
  sm: 'clamp(140px, 38vw, 180px)',
  md: 'clamp(200px, 48vw, 280px)',
  lg: 'clamp(260px, 70vw, 360px)',
  xl: 'clamp(280px, 78vw, 400px)',
};

/**
 * Logo / wordmark BoulotFlash réutilisable (auth, légal, accueil, nav).
 */
export function BrandLogo({
  size = 'lg',
  priority = false,
  href,
  centered = false,
}: BrandLogoProps) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo/boulotflash.svg"
      alt={tokens.copy.brand}
      width={488}
      height={116}
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
  );

  const inner = href ? (
    <UnstyledButton
      component={Link}
      href={href}
      aria-label={`${tokens.copy.brand} — accueil`}
      style={{ display: 'inline-flex', maxWidth: '100%' }}
    >
      {img}
    </UnstyledButton>
  ) : (
    <Box
      component="span"
      display="inline-flex"
      style={{ maxWidth: '100%' }}
      aria-label={tokens.copy.brand}
    >
      {img}
    </Box>
  );

  if (!centered) return inner;

  return (
    <Box
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      {inner}
    </Box>
  );
}
