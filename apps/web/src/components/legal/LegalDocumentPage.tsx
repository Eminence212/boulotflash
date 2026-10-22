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
  Loader,
  Center,
} from '@mantine/core';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { tokens } from '@/theme/tokens';

type LegalDocumentPageProps = {
  title: string;
  /** Chemin public, ex. /legal/conditions.md */
  src: string;
};

/**
 * Affiche un document juridique markdown (version validée D24).
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
        if (!cancelled) setBody(text);
      })
      .catch(() => {
        if (!cancelled) setError('Document indisponible pour le moment.');
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <main className="min-h-dvh bg-canvas">
      <Container size={720} px={{ base: 'md', sm: 'xl' }} py={{ base: 'xl', md: 48 }}>
        <Stack gap="lg">
          <BrandLogo size="sm" />
          <Anchor component={Link} href="/connexion" size="sm">
            ← Retour à la connexion
          </Anchor>
          <Paper
            withBorder
            shadow="sm"
            radius="lg"
            p={{ base: 'md', sm: 'xl' }}
            style={{ borderColor: tokens.color.border.subtle }}
          >
            <Stack gap="md">
              <Title order={1} style={{ fontFamily: 'var(--font-display)' }}>
                {title}
              </Title>
              <Text size="xs" c="dimmed">
                Version 0.1 — validée localement (D24, 22 octobre 2026).
              </Text>
              {error ? (
                <Text c="red" size="sm">
                  {error}
                </Text>
              ) : null}
              {!body && !error ? (
                <Center py="xl">
                  <Loader color="flash" size="sm" />
                </Center>
              ) : null}
              {body ? (
                <ScrollArea.Autosize mah="70dvh" type="auto" offsetScrollbars>
                  <Text
                    component="pre"
                    size="sm"
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'var(--font-body)',
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {body}
                  </Text>
                </ScrollArea.Autosize>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </main>
  );
}
