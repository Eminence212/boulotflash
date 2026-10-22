'use client';

import type { ReactNode } from 'react';
import { Box, Container, Stack } from '@mantine/core';
import { BrandLogo, BRAND_LOGO_PAGE_SIZE } from '@/components/brand';
import { tokens } from '@/theme/tokens';

type AuthPageShellProps = {
  children: ReactNode;
  /** Largeur max du bloc (mobile-first) — logo et formulaire partagent cette colonne. */
  containerSize?: number | string;
};

/**
 * Gabarit auth : une seule colonne (logo centré sur la largeur du formulaire).
 */
export function AuthPageShell({
  children,
  containerSize = 420,
}: AuthPageShellProps) {
  return (
    <Box
      component="main"
      mih="100dvh"
      bg={tokens.color.surface.canvas}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Container
        size={containerSize}
        w="100%"
        px={{ base: 'md', xs: 'lg' }}
        py={{ base: 'xl', sm: 40, md: 56 }}
      >
        <Stack gap="md" align="stretch" w="100%">
          <BrandLogo
            size={BRAND_LOGO_PAGE_SIZE}
            href="/"
            priority
            centered
          />
          <Box w="100%">{children}</Box>
        </Stack>
      </Container>
    </Box>
  );
}
