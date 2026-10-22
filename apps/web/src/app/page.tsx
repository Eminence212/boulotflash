'use client';

import { Title, Text, Stack, Group, Badge, Container } from '@mantine/core';
import { IconBolt } from '@tabler/icons-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { tokens, mantineStatusColors } from '@/theme/tokens';

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-canvas">
      <Container size={640} px={{ base: 'md', sm: 'xl' }} py={{ base: 'xl', md: 48 }}>
      <Stack gap="lg">
        <BrandLogo size="md" priority />

        <Title
          order={1}
          style={{
            fontFamily: 'var(--font-display)',
            color: tokens.color.brand.flash,
          }}
        >
          {tokens.copy.brand}
        </Title>

        <Text size="lg" c="dimmed">
          {tokens.copy.tagline}
        </Text>

        <Group gap="xs">
          <IconBolt size={20} stroke={2} color={tokens.color.brand.flash} aria-hidden />
          <Text size="sm" c="dimmed">
            Socle étape 04 — page vide de métier. Jetons Mantine + Tailwind.
          </Text>
        </Group>

        <Group gap="xs">
          {(Object.keys(mantineStatusColors) as (keyof typeof mantineStatusColors)[]).map(
            (key) => (
              <Badge
                key={key}
                radius="xl"
                style={{
                  background: mantineStatusColors[key].bg,
                  color: mantineStatusColors[key].fg,
                }}
              >
                {mantineStatusColors[key].label}
              </Badge>
            ),
          )}
        </Group>
      </Stack>
      </Container>
    </main>
  );
}
