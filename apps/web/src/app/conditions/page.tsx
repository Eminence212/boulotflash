import Link from 'next/link';
import { Title, Text, Stack } from '@mantine/core';

export default function ConditionsPage() {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 flex justify-center">
      <Stack maw={640} w="100%" gap="md">
        <Text size="sm">
          <Link href="/connexion">← Connexion</Link>
        </Text>
        <Title order={1}>Conditions d’utilisation</Title>
        <Text size="sm" c="dimmed">
          Document projet, non validé. Le texte normatif vit dans la
          documentation d’implémentation ; cette page est un point d’entrée PWA.
        </Text>
      </Stack>
    </main>
  );
}
