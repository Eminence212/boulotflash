'use client';

import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import 'dayjs/locale/fr';
import { LoadingProvider } from '@/components/feedback';
import { boulotflashTheme } from '@/theme/mantine-theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={boulotflashTheme} defaultColorScheme="light">
      <DatesProvider settings={{ locale: 'fr', firstDayOfWeek: 1 }}>
        <LoadingProvider>{children}</LoadingProvider>
      </DatesProvider>
    </MantineProvider>
  );
}
