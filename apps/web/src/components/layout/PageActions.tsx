'use client';

import type { ReactNode } from 'react';
import { Box, Container } from '@mantine/core';
import { tokens } from '@/theme/tokens';

/** Actions principales, toujours visibles au-dessus de la barre du bas. */
export function PageActions({ children }: { children: ReactNode }) {
  return (
    <>
      <Box h={112} aria-hidden />
      <Box
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'var(--bf-tabbar, env(safe-area-inset-bottom))',
          zIndex: 25,
          background: tokens.color.surface.card,
          borderTop: `1px solid ${tokens.color.border.subtle}`,
          padding: '0.75rem 1rem',
        }}
      >
        <Container size={640} px={0}>
          {children}
        </Container>
      </Box>
    </>
  );
}
