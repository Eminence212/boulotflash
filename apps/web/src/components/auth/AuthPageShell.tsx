'use client';

import type { ReactNode } from 'react';
import { Box, Container, Stack } from '@mantine/core';
import { BrandLogo } from '@/components/brand';
import { tokens } from '@/theme/tokens';

type AuthPageShellProps = {
  children: ReactNode;
  /** Largeur max du bloc (mobile-first). */
  containerSize?: number | string;
};

/**
 * Gabarit auth : logo hero + zone formulaire (Paper fourni par AuthenticationForm).
 */
export function AuthPageShell({
  children,
  containerSize = 470,
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
        px={{ base: 'md', xs: 'lg', sm: 'xl' }}
        py={{ base: 'xl', sm: 48, md: 64 }}
      >
        <Stack gap="lg" align="stretch">
          <BrandLogo size="xl" href="/" priority centered />
          {children}
        </Stack>
      </Container>
    </Box>
  );
}
