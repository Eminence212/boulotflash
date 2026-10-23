'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Anchor,
  Container,
  Paper,
  Stack,
  Text,
  Title,
  ScrollArea,
} from '@mantine/core';
import { BrandLogo, BRAND_LOGO_PAGE_SIZE } from '@/components/brand';
import { AppAlert, GlobalLoader } from '@/components/feedback';
import { LegalMarkdown } from '@/components/legal/LegalMarkdown';
import { prepareLegalMarkdown } from '@/components/legal/prepareLegalMarkdown';
import { tokens } from '@/theme/tokens';

type LegalDocumentPageProps = {
  title: string;
  /** Chemin public, ex. /legal/conditions.md */
  src: string;
};

/**
 * Page juridique : logo réutilisable + contenu formaté (pas de Markdown brut).
 */
export function LegalDocumentPage({ title, src }: LegalDocumentPageProps) {
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setBody(prepareLegalMarkdown(text));
      })
      .catch(() => {
        if (!cancelled) setError('Document indisponible pour le moment.');
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!body && !error) {
    return <GlobalLoader fullscreen />;
  }

  return (
    <main className="min-h-dvh bg-canvas">
      <Container size={720} px={{ base: 'md', sm: 'xl' }} py={{ base: 'xl', md: 48 }}>
        <Stack gap="lg">
          <BrandLogo
            size={BRAND_LOGO_PAGE_SIZE}
            href="/"
            priority
            centered
          />

          <Anchor component={Link} href="/connexion" size="sm">
            ← Retour à la connexion
          </Anchor>

          <Paper
            withBorder
            shadow="sm"
            radius="md"
            p={{ base: 'md', sm: 'xl' }}
            style={{ borderColor: tokens.color.border.subtle }}
          >
            <Stack gap="md">
              <Title order={1} fw={900}>
                {title}
              </Title>
              <Text size="xs" c="dimmed">
                Version 0.1 — validée localement (D24, 22 octobre 2026).
              </Text>

              {error ? (
                <AppAlert tone="error" title="Document">
                  {error}
                </AppAlert>
              ) : null}

              {body ? (
                <ScrollArea.Autosize mah="70dvh" type="auto" offsetScrollbars>
                  <LegalMarkdown content={body} />
                </ScrollArea.Autosize>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </main>
  );
}
