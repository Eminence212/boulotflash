'use client';

import { MantineProvider } from '@mantine/core';
import { boulotflashTheme } from '@/theme/mantine-theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={boulotflashTheme} defaultColorScheme="light">
      {children}
    </MantineProvider>
  );
}
