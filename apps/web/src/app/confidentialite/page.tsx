import Link from 'next/link';
import { Title, Text, Stack } from '@mantine/core';

export default function ConfidentialitePage() {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 flex justify-center">
      <Stack maw={640} w="100%" gap="md">
        <Text size="sm">
          <Link href="/connexion">← Connexion</Link>
        </Text>
        <Title order={1}>Politique de confidentialité</Title>
        <Text size="sm" c="dimmed">
          Document projet, non validé. Les données OAuth et le téléphone ne sont
          utilisés que pour la mise en relation une fois les providers branchés
          (étape 09).
        </Text>
      </Stack>
    </main>
  );
}
