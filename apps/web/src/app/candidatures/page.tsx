'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronRight, IconClipboardText, IconMapPin } from '@tabler/icons-react';
import { AppAlert, GlobalLoader } from '@/components/feedback';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import { applicationTone } from '@/lib/application-status';
import { formatMoney, formatStartAt, isEmployerMode, payUnitLabel, timeLeftLabel } from '@/lib/me';
import { tokens } from '@/theme/tokens';

type HistoryItem = {
  id: string;
  jobId: string;
  title: string;
  status: string;
  statusLabel: string;
  appliedAt: string;
  commune: string;
  amount: number;
  currency: string;
  payUnit: string;
  offerExpiresAt: string | null;
  offer: { id: string; status: string; expiresAt: string; expired: boolean } | null;
};

export default function CandidaturesPage() {
  const { me, loading, refresh } = useMe({ requireAuth: true });
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

  const count = items.length;

  return (
    <AppShellLayout me={me}>
      <Stack gap="md">
        <PageHeader
          title="Mes candidatures"
          description={
            count > 0
              ? `${count} candidature${count > 1 ? 's' : ''}. Le montant affiché est celui de l’offre au moment où vous avez postulé.`
              : 'Suivez ici le statut de chaque candidature.'
          }
        />

        {error ? (
          <AppAlert tone="error" title="Historique">
            {error}
          </AppAlert>
        ) : null}

        {isEmployerMode(me) ? (
          <AppAlert tone="info" title="Mode recruteur">
            Passez en mode candidat pour voir vos candidatures.
          </AppAlert>
        ) : count === 0 && !error ? (
          <EmptyState
            icon={IconClipboardText}
            title="Aucune candidature pour l’instant"
            description="Choisissez une mission, confirmez votre disponibilité et postulez. Vous pouvez envoyer jusqu’à 5 candidatures par jour."
            action={{ label: 'Voir les missions', href: '/' }}
          />
        ) : (
          <Stack component="ul" gap="sm" p={0} m={0} style={{ listStyle: 'none' }}>
            {items.map((item) => (
              <li key={item.id}>
                <UnstyledButton
                  component={Link}
                  href={`/missions/${item.jobId}`}
                  w="100%"
                  aria-label={`${item.title}, ${item.statusLabel}`}
                >
                  <Paper
                    radius="lg"
                    p="md"
                    withBorder
                    className="bf-card-hover"
                    style={{ borderColor: tokens.color.border.subtle }}
                  >
                    <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
                      <Stack gap={6} style={{ minWidth: 0 }}>
                        <Group gap="xs" wrap="wrap">
                          <Text fw={700} style={{ lineHeight: 1.3 }}>
                            {item.title}
                          </Text>
                          <StatusBadge tone={applicationTone(item.status)}>
                            {item.statusLabel}
                          </StatusBadge>
                        </Group>
                        <Text size="sm">
                          <Text span fw={700}>
                            {formatMoney(item.amount, item.currency)}
                          </Text>{' '}
                          <Text span c="dimmed">
                            {payUnitLabel(item.payUnit)}
                          </Text>
                        </Text>
                        <Group gap={6} wrap="nowrap">
                          <IconMapPin size={16} stroke={2} color={tokens.color.brand.inkMuted} aria-hidden />
                          <Text size="sm">{item.commune}</Text>
                        </Group>
                        <Text size="xs" c="dimmed">
                          Envoyée le {formatStartAt(item.appliedAt)}
                        </Text>
                        {item.status === 'OFFERED' && item.offer && !item.offer.expired ? (
                          <Text size="sm" fw={700} c={tokens.color.status.alerte.fg}>
                            Place proposée : répondez avant le {formatStartAt(item.offer.expiresAt)}
                            {timeLeftLabel(item.offer.expiresAt) ? ` (${timeLeftLabel(item.offer.expiresAt)})` : ''}
                          </Text>
                        ) : null}
                        {item.offer?.expired && item.status !== 'ACCEPTED' ? (
                          <Text size="sm" fw={600} c={tokens.color.status.refus.fg}>
                            Cette proposition a expiré.
                          </Text>
                        ) : null}
                      </Stack>
                      <IconChevronRight
                        size={20}
                        stroke={2}
                        color={tokens.color.brand.inkMuted}
                        aria-hidden
                        style={{ flexShrink: 0, marginTop: 2 }}
                      />
                    </Group>
                  </Paper>
                </UnstyledButton>
              </li>
            ))}
          </Stack>
        )}
      </Stack>
    </AppShellLayout>
  );
}
