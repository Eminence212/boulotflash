'use client';

import type { ReactNode } from 'react';
import { Drawer, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { tokens } from '@/theme/tokens';

type MissionFormSheetProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Même panneau que les filtres : tiroir à droite, feuille en bas sur mobile. */
export function MissionFormSheet({ title, onClose, children }: MissionFormSheetProps) {
  const isMobile = useMediaQuery('(max-width: 48em)');

  return (
    <Drawer
      opened
      onClose={onClose}
      position={isMobile ? 'bottom' : 'right'}
      size={isMobile ? '92%' : '32rem'}
      padding="md"
      radius={isMobile ? 'md' : 0}
      title={
        <Text fw={700} style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </Text>
      }
      styles={{
        content: {
          display: 'flex',
          flexDirection: 'column',
          ...(isMobile
            ? {
                maxHeight: '92dvh',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }
            : { height: '100%' }),
        },
        header: {
          borderBottom: `1px solid ${tokens.color.border.subtle}`,
        },
        body: {
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {children}
    </Drawer>
  );
}
