'use client';

import { MantineProvider } from '@mantine/core';
import { LoadingProvider } from '@/components/feedback';
import { boulotflashTheme } from '@/theme/mantine-theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={boulotflashTheme} defaultColorScheme="light">
      <LoadingProvider>{children}</LoadingProvider>
    </MantineProvider>
  );
}
