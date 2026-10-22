import { Title, Text, Stack, Group, Badge } from '@mantine/core';
import { IconBolt } from '@tabler/icons-react';
import { tokens, mantineStatusColors } from '@/theme/tokens';

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-canvas px-5 py-10 md:px-8">
      <Stack maw={640} mx="auto" gap="lg">
        <Group gap="sm" align="center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/boulotflash.svg"
            alt={tokens.copy.brand}
            height={40}
            style={{ height: 40, width: 'auto' }}
          />
        </Group>

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
    </main>
  );
}
