'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Container } from '@mantine/core';
import { tokens } from '@/theme/tokens';

/** Actions principales, toujours visibles au-dessus de la barre du bas. */
export function PageActions({ children }: { children: ReactNode }) {
  const barRef = useRef<HTMLDivElement>(null);
  // La réserve suit la hauteur réelle de la barre : rien du contenu ne passe dessous.
  const [reserve, setReserve] = useState(112);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const observer = new ResizeObserver(() => setReserve(bar.offsetHeight + 16));
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Box h={reserve} aria-hidden />
      <Box
        ref={barRef}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'var(--bf-tabbar, env(safe-area-inset-bottom))',
          zIndex: 25,
          background: tokens.color.surface.card,
          borderTop: `1px solid ${tokens.color.border.subtle}`,
          boxShadow: '0 -6px 16px rgba(11, 18, 32, 0.06)',
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
