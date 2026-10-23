'use client';

import Link from 'next/link';
import { Box, UnstyledButton } from '@mantine/core';
import { tokens } from '@/theme/tokens';

/** Source unique du wordmark (public/). */
export const BRAND_LOGO_SRC = '/logo/boulotflash.svg';

export type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl';

/** Taille standard pages (auth, légal, accueil). */
export const BRAND_LOGO_PAGE_SIZE: BrandLogoSize = 'md';

type BrandLogoProps = {
  /**
   * Taille responsive du wordmark.
   * - sm : barre compacte / nav
   * - md : pages (défaut recommandé)
   * - lg / xl : hero large
   */
  size?: BrandLogoSize;
  /** Priorité LCP (écran connexion / accueil). */
  priority?: boolean;
  /** Lien optionnel (ex. vers `/` ou `/connexion`). */
  href?: string;
  /** Centrer le logo dans la largeur du parent. */
  centered?: boolean;
};

/** Largeurs visibles — viewBox recadré (~488×116). */
const WIDTHS: Record<BrandLogoSize, string> = {
  sm: 'clamp(140px, 38vw, 180px)',
  md: 'clamp(180px, 44vw, 240px)',
  lg: 'clamp(220px, 58vw, 300px)',
  xl: 'clamp(260px, 68vw, 360px)',
};

/**
 * Logo / wordmark BoulotFlash — seul composant à utiliser pour la marque.
 */
export function BrandLogo({
  size = BRAND_LOGO_PAGE_SIZE,
  priority = false,
  href,
  centered = false,
}: BrandLogoProps) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
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
