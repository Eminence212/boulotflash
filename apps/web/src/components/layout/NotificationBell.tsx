'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ActionIcon, Indicator } from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { fetchNotifications, unreadLabel } from '@/lib/notifications';
import { tokens } from '@/theme/tokens';

/**
 * Cloche de l’en-tête : ouvre le centre in-app, avec le nombre de non lues. Relue à chaque changement
 * de page et au retour sur l’onglet ; aucun push, aucune permission navigateur (CDC §8.3).
 */
export function NotificationBell() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void fetchNotifications(true).then((res) => {
        if (alive && res) setUnread(res.unreadCount);
      });
    };
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('bf:notifications-changed', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.removeEventListener('bf:notifications-changed', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  const active = pathname?.startsWith('/notifications');

  return (
    <Indicator
      disabled={unread === 0}
      label={unread > 9 ? '9+' : unread}
      size={18}
      offset={6}
      color="red"
      withBorder
    >
      <ActionIcon
        component={Link}
        href="/notifications"
        variant={active ? 'light' : 'subtle'}
        color={active ? 'flash' : 'gray'}
        size={40}
        radius="xl"
        aria-label={`Notifications. ${unreadLabel(unread)}.`}
        aria-current={active ? 'page' : undefined}
        style={{ color: active ? undefined : tokens.color.brand.ink }}
      >
        <IconBell size={22} stroke={1.9} aria-hidden />
      </ActionIcon>
    </Indicator>
  );
}
