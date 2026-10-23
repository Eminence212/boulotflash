'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Stack, Text, Title } from '@mantine/core';
import { AppAlert, GlobalLoader } from '@/components/feedback';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import { formatMoney, formatStartAt, isEmployerMode } from '@/lib/me';

type HistoryItem = {
  id: string;
  jobId: string;
  title: string;
  statusLabel: string;
  appliedAt: string;
  commune: string;
  amount: number;
  currency: string;
  payUnit: string;
  offerExpiresAt: string | null;
};

function payUnitLabel(unit: string): string {
  if (unit === 'HOUR') return 'par heure';
  if (unit === 'DAY') return 'par jour';
  return 'la mission';
}

export default function CandidaturesPage() {
  const { me, loading } = useMe({ requireAuth: true });
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const token = readAccessToken();
    if (!token) return;
    if (isEmployerMode(me)) {
      setItems([]);
      return;
    }
    void apiFetch<{ items?: HistoryItem[]; message?: string }>('/applications', {
      accessToken: token,
    }).then(({ status, data }) => {
      if (status >= 400) {
        setError(data.message ?? 'Historique indisponible.');
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    });
  }, [loading, me]);

  if (loading || items === null) {
    return <GlobalLoader fullscreen />;
  }

  return (
    <AppShellLayout me={me} title="Candidatures">
      <Stack gap="md" p="md">
        <Title order={2}>Mes candidatures</Title>
        {error ? (
          <AppAlert tone="error" title="Historique">
            {error}
          </AppAlert>
        ) : null}
        {isEmployerMode(me) ? (
          <Text c="dimmed">Passez en mode candidat pour voir vos candidatures.</Text>
        ) : items.length === 0 ? (
          <Text c="dimmed">Aucune candidature.</Text>
        ) : (
          items.map((item) => (
            <Stack
              key={item.id}
              gap={6}
              p="md"
              style={{
                background: '#fff',
                borderRadius: 16,
              }}
            >
              <Text fw={700} component={Link} href={`/missions/${item.jobId}`}>
                {item.title}
              </Text>
              <StatusBadge>{item.statusLabel}</StatusBadge>
              <Text size="sm">{formatStartAt(item.appliedAt)}</Text>
              <Text size="sm">{item.commune}</Text>
              <Text size="sm" fw={600}>
                {formatMoney(item.amount, item.currency)} {payUnitLabel(item.payUnit)}
              </Text>
              {item.offerExpiresAt ? (
                <Text size="sm">Offre jusqu’au {formatStartAt(item.offerExpiresAt)}</Text>
              ) : null}
            </Stack>
          ))
        )}
      </Stack>
    </AppShellLayout>
  );
}
