'use client';

import type { ReactNode } from 'react';
import { Alert, type AlertProps } from '@mantine/core';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
} from '@tabler/icons-react';

export type AppAlertTone = 'error' | 'warning' | 'success' | 'info';

const TONE: Record<
  AppAlertTone,
  {
    color: AlertProps['color'];
    title: string;
    Icon: typeof IconInfoCircle;
  }
> = {
  error: {
    color: 'red',
    title: 'Erreur',
    Icon: IconAlertCircle,
  },
  warning: {
    color: 'yellow',
    title: 'Attention',
    Icon: IconAlertTriangle,
  },
  success: {
    color: 'teal',
    title: 'OK',
    Icon: IconCircleCheck,
  },
  // Bleu Mantine (échelle 0–9) — pas la marque `flash` (tuple plat = contraste faible).
  info: {
    color: 'blue',
    title: 'Info',
    Icon: IconInfoCircle,
  },
};

export type AppAlertProps = Omit<AlertProps, 'color' | 'children' | 'icon'> & {
  /** Ton sémantique — fixe couleur + icône Mantine. */
  tone?: AppAlertTone;
  children: ReactNode;
  /** Masquer le titre (icône + corps seulement). */
  hideTitle?: boolean;
};

/**
 * Alerte Mantine réutilisable (icône + variant light + role=alert pour les erreurs).
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
  const Icon = cfg.Icon;
  const resolvedTitle = hideTitle ? undefined : (title ?? cfg.title);

  return (
    <Alert
      variant={variant}
      radius={radius}
      color={cfg.color}
      title={resolvedTitle}
      icon={<Icon size={18} stroke={1.75} aria-hidden />}
      role={tone === 'error' ? 'alert' : undefined}
      {...rest}
    >
      {children}
    </Alert>
  );
}
