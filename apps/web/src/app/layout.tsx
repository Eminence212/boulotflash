import type { Metadata } from 'next';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import './globals.css';
import { ColorSchemeScript } from '@mantine/core';
import { Outfit } from 'next/font/google';
import { Providers } from './providers';
import { tokens } from '@/theme/tokens';

export const metadata: Metadata = {
  title: tokens.copy.brand,
  description: tokens.copy.tagline,
};

// Police servie par l’app : pas de feuille Google bloquante avant le premier affichage.
const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={outfit.variable}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        <link rel="icon" href="/logo/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
