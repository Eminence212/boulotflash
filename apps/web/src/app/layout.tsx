import type { Metadata } from 'next';
import '@mantine/core/styles.css';
import './globals.css';
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from './providers';
import { tokens } from '@/theme/tokens';

export const metadata: Metadata = {
  title: tokens.copy.brand,
  description: tokens.copy.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;1,600&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
