'use client';

import type { ReactNode } from 'react';
import { Alert, type AlertProps } from '@mantine/core';
import {
  CheckIcon,
  InfoIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';

export type AppAlertTone = 'error' | 'warning' | 'success' | 'info';

const TONE: Record<
  AppAlertTone,
  {
    color: AlertProps['color'];
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

export type AppAlertProps = Omit<AlertProps, 'color' | 'children' | 'icon'> & {
  /** Ton sémantique — couleur + icône Phosphor. */
  tone?: AppAlertTone;
  children: ReactNode;
  /** Masquer le titre. */
  hideTitle?: boolean;
};

/**
 * Feedback inline pour attirer l’attention (Mantine Alert).
 * Ne pas confondre avec le système de notifications dynamiques (@mantine/notifications).
 */
export function AppAlert({
  tone = 'info',
  title,
  hideTitle = false,
  children,
  variant = 'light',
  radius = 'md',
  ...rest
}: AppAlertProps) {
  const cfg = TONE[tone];
  const resolvedTitle = hideTitle ? undefined : (title ?? cfg.title);

  return (
    <Alert
      variant={variant}
      radius={radius}
      color={cfg.color}
      title={resolvedTitle}
      icon={cfg.icon}
      role={tone === 'error' ? 'alert' : undefined}
      {...rest}
    >
      {children}
    </Alert>
  );
}
