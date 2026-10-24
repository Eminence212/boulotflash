'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import {
  IconAlertTriangle,
  IconBell,
  IconBriefcase,
  IconCircleCheck,
  IconClockX,
  IconHandStop,
  IconPencil,
  IconSparkles,
  IconStar,
  IconUserPlus,
  IconX,
  type Icon,
} from '@tabler/icons-react';
import { AppAlert, GlobalLoader } from '@/components/feedback';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useMe } from '@/hooks/useMe';
import {
  fetchNotifications,
  markNotificationRead,
  unreadLabel,
  type InAppNotification,
} from '@/lib/notifications';
import { formatPublishedAgo } from '@/lib/published-ago';
import { tokens } from '@/theme/tokens';

const ICONS: Record<string, { icon: Icon; color: string }> = {
  job_match: { icon: IconSparkles, color: 'flash' },
  application_submitted: { icon: IconUserPlus, color: 'flash' },
  application_shortlisted: { icon: IconStar, color: 'flash' },
  application_rejected: { icon: IconX, color: 'gray' },
  selection_offer_created: { icon: IconBriefcase, color: 'orange' },
  selection_offer_accepted: { icon: IconCircleCheck, color: 'green' },
  selection_offer_declined: { icon: IconHandStop, color: 'gray' },
  selection_offer_expired: { icon: IconClockX, color: 'gray' },
  participation_cancelled: { icon: IconAlertTriangle, color: 'red' },
  job_changed: { icon: IconPencil, color: 'orange' },
  job_suspended: { icon: IconAlertTriangle, color: 'red' },
};

/** Centre de notifications in-app (étape 18) : seul canal métier au pilote, lu / non lu. */
export default function NotificationsPage() {
  const router = useRouter();
  const { me, loading } = useMe({ requireAuth: true });
  const [data, setData] = useState<{ unreadCount: number; items: InAppNotification[] } | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchNotifications();
    if (!res) {
      setError(true);
      setData({ unreadCount: 0, items: [] });
      return;
    }
    setError(false);
    setData(res);
  }, []);

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  async function open(item: InAppNotification) {
    if (!item.read) {
      // Lue tout de suite à l’écran ; l’API garde la première date de lecture.
      setData((prev) =>
        prev
          ? {
              unreadCount: Math.max(0, prev.unreadCount - 1),
              items: prev.items.map((i) => (i.id === item.id ? { ...i, read: true } : i)),
            }
          : prev,
      );
      await markNotificationRead(item.id);
      window.dispatchEvent(new Event('bf:notifications-changed'));
    }
    if (item.href) router.push(item.href);
  }

  if (loading || !me || data === null) {
    return <GlobalLoader fullscreen />;
  }

  return (
    <AppShellLayout me={me}>
      <Stack gap="md">
        <PageHeader
          title="Notifications"
          description={
            data.items.length > 0
              ? `${unreadLabel(data.unreadCount)}. Touchez une notification pour ouvrir l’écran concerné.`
              : 'Candidatures, propositions, acceptations et missions qui vous correspondent arrivent ici.'
          }
        />

        {error ? (
          <AppAlert tone="error" title="Notifications">
            Notifications indisponibles pour le moment. Vérifiez votre connexion puis rouvrez la page.
          </AppAlert>
        ) : null}

        {!error && data.items.length === 0 ? (
          <EmptyState
            icon={IconBell}
            title="Aucune notification"
            description="Rien de nouveau pour l’instant. Les notifications restent dans l’application : aucun SMS, e-mail ni push."
            action={{ label: 'Voir les missions', href: '/' }}
          />
        ) : null}

        <Stack gap="xs" component="ul" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {data.items.map((item) => {
            const look = ICONS[item.type] ?? { icon: IconBell, color: 'gray' };
            const ItemIcon = look.icon;
            return (
              <li key={item.id}>
                <UnstyledButton
                  onClick={() => void open(item)}
                  w="100%"
                  p="md"
                  className="bf-card-hover"
                  aria-label={`${item.read ? '' : 'Non lue. '}${item.title}. ${item.message}`}
                  style={{
                    display: 'block',
                    borderRadius: 16,
                    background: item.read ? tokens.color.surface.card : tokens.color.brand.flashSoft,
                    border: `1px solid ${item.read ? tokens.color.border.subtle : tokens.color.brand.flash}`,
                    cursor: item.href ? 'pointer' : 'default',
                  }}
                >
                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <ThemeIcon size={36} radius="xl" variant="light" color={look.color} aria-hidden>
                      <ItemIcon size={20} stroke={1.9} />
                    </ThemeIcon>
                    <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                      <Group justify="space-between" gap="xs" wrap="nowrap" align="flex-start">
                        <Text fw={item.read ? 600 : 800} style={{ lineHeight: 1.3 }}>
                          {item.title}
                        </Text>
                        {!item.read ? (
                          <span
                            aria-hidden
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: tokens.color.brand.flash,
                              flexShrink: 0,
                              marginTop: 6,
                            }}
                          />
                        ) : null}
                      </Group>
                      <Text size="sm" style={{ lineHeight: 1.5 }}>
                        {item.message}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatPublishedAgo(item.createdAt)}
                      </Text>
                    </Stack>
                  </Group>
                </UnstyledButton>
              </li>
            );
          })}
        </Stack>
      </Stack>
    </AppShellLayout>
  );
}
