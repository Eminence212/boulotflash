'use client';

import type { ReactNode } from 'react';
import { Container, Paper, Stack, Text, Title, Box } from '@mantine/core';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { tokens } from '@/theme/tokens';

type AuthPageShellProps = {
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  /** Largeur max du bloc (mobile-first, s’élargit sur tablette/desktop). */
  containerSize?: number | string;
};

/**
 * Gabarit auth inspiré de GO-PASS AuthPageShell :
 * logo hero centré, titre, carte Mantine responsive.
 */
export function AuthPageShell({
  title,
  subtitle,
  children,
  containerSize = 440,
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
          <Box style={{ display: 'flex', justifyContent: 'center' }}>
            <BrandLogo size="lg" priority />
          </Box>

          <Stack gap="xs" ta="center">
            <Title
              order={1}
              fz={{ base: 26, sm: 32 }}
              lh={1.2}
              style={{
                fontFamily: 'var(--font-display)',
                color: tokens.color.brand.ink,
              }}
            >
              {title}
            </Title>
            {subtitle ? (
              <Text c="dimmed" size="sm" maw={360} mx="auto">
                {subtitle}
              </Text>
            ) : null}
          </Stack>

          <Paper
            withBorder
            shadow="sm"
            radius="lg"
            p={{ base: 'md', sm: 'xl' }}
            bg={tokens.color.surface.card}
            style={{ borderColor: tokens.color.border.subtle }}
          >
            {children}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
