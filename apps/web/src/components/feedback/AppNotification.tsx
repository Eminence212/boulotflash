'use client';

import type { ReactNode } from 'react';
import { Notification, type NotificationProps } from '@mantine/core';
import {
  CheckIcon,
  InfoIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';

export type AppNotificationTone = 'error' | 'warning' | 'success' | 'info';

const TONE: Record<
  AppNotificationTone,
  {
    color: NotificationProps['color'];
    title: string;
    icon: ReactNode;
  }
> = {
  error: {
    color: 'red',
    title: 'Erreur',
    icon: <XIcon size={20} aria-hidden />,
  },
  warning: {
    color: 'yellow',
    title: 'Attention',
    icon: <WarningIcon size={20} aria-hidden />,
  },
  success: {
    color: 'teal',
    title: 'OK',
    icon: <CheckIcon size={20} aria-hidden />,
  },
  info: {
    color: 'blue',
    title: 'Info',
    icon: <InfoIcon size={20} aria-hidden />,
  },
};

export type AppNotificationProps = Omit<
  NotificationProps,
  'color' | 'children' | 'icon'
> & {
  /** Ton sémantique — couleur + icône Phosphor. */
  tone?: AppNotificationTone;
  children: ReactNode;
  /** Masquer le titre. */
  hideTitle?: boolean;
  /** Afficher le bouton fermer (défaut : non pour les messages inline). */
  withCloseButton?: boolean;
};

/**
 * Notification Mantine réutilisable (doc Notification + @phosphor-icons/react).
 */
export function AppNotification({
  tone = 'info',
  title,
  hideTitle = false,
  children,
  withCloseButton = false,
  radius = 'md',
  ...rest
}: AppNotificationProps) {
  const cfg = TONE[tone];
  const resolvedTitle = hideTitle ? undefined : (title ?? cfg.title);

  return (
    <Notification
      icon={cfg.icon}
      color={cfg.color}
      title={resolvedTitle}
      radius={radius}
      withCloseButton={withCloseButton}
      role={tone === 'error' ? 'alert' : 'status'}
      {...rest}
    >
      {children}
    </Notification>
  );
}

/** Alias historique — préférer `AppNotification`. */
export const AppAlert = AppNotification;
export type AppAlertTone = AppNotificationTone;
export type AppAlertProps = AppNotificationProps;
