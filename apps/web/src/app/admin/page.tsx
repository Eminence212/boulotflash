'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Stack, Text, Title } from '@mantine/core';
import { BrandLogo, BRAND_LOGO_PAGE_SIZE } from '@/components/brand';
import { AppButton } from '@/components/feedback';
import {
  adminFetch,
  clearAdminAccessToken,
  readAdminAccessToken,
} from '@/lib/admin-api';
import { tokens } from '@/theme/tokens';

export default function AdminHomePage() {
  const router = useRouter();
  const [scope, setScope] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = readAdminAccessToken();
    if (!token) {
      router.replace('/admin/connexion');
      return;
    }
    void (async () => {
      const { status, data } = await adminFetch<{ scope?: string }>('/admin/me');
      if (status >= 400 || !data.scope) {
        clearAdminAccessToken();
        router.replace('/admin/connexion');
        return;
      }
      setScope(data.scope);
      setReady(true);
    })();
  }, [router]);

  async function logout() {
    try {
      await adminFetch('/admin/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearAdminAccessToken();
    router.replace('/admin/connexion');
  }

  if (!ready) {
    return (
      <Container py="xl">
        <Text c="dimmed" size="sm">
          Vérification de la session…
        </Text>
      </Container>
    );
  }

  return (
    <Container size={640} py={{ base: 'xl', sm: 48 }}>
      <Stack gap="lg">
        <BrandLogo size={BRAND_LOGO_PAGE_SIZE} href="/admin" />
        <Title
          order={1}
          fz={24}
          fw={800}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Tableau de bord
        </Title>
        <Text size="sm" c="dimmed">
          Session admin · scope {scope}. Les files de modération arriveront aux
          étapes suivantes.
        </Text>
        <Text
          size="sm"
          p="md"
          style={{
            border: `1px solid ${tokens.color.border.subtle}`,
            borderRadius: 12,
            background: tokens.color.surface.canvas,
          }}
        >
          Aucune file active pour le moment.
        </Text>
        <AppButton variant="default" onClick={() => void logout()} w="fit-content">
          Déconnexion
        </AppButton>
      </Stack>
    </Container>
  );
}
