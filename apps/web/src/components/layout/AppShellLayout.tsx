'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Group,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconBriefcase, IconHome, IconUser } from '@tabler/icons-react';
import { BrandLogo } from '@/components/brand';
import { ModeSwitcher } from '@/components/boulotflash/ModeSwitcher';
import { AccountMenu } from '@/components/layout/AccountMenu';
import {
  disableCurrentLocation,
  LocationConsent,
} from '@/components/layout/LocationConsent';
import { SessionAuthButton } from '@/components/layout/SessionAuthButton';
import { performLogout } from '@/hooks/useMe';
import type { MeResponse } from '@/lib/me';
import { isEmployerMode } from '@/lib/me';
import { pageForMode } from '@/lib/mode-route';
import { tokens } from '@/theme/tokens';

type Tab = {
  href: string;
  label: string;
  icon: typeof IconHome;
  match: (path: string) => boolean;
};

type AppShellLayoutProps = {
  children: ReactNode;
  me: MeResponse | null;
  onModeChanged?: (mode: 'WORKER' | 'EMPLOYER') => void;
  title?: string;
  hideTabbar?: boolean;
  /** Profil et liste à recharger après un changement de position. */
  onLocationChanged?: () => void;
};

function tabsFor(me: MeResponse | null): Tab[] {
  const employer = isEmployerMode(me);
  if (employer) {
    return [
      {
        href: '/',
        label: 'Accueil',
        icon: IconHome,
        match: (p) => p === '/',
      },
      {
        href: '/missions',
        label: 'Missions',
        icon: IconBriefcase,
        match: (p) => p.startsWith('/missions') || p.startsWith('/publier'),
      },
      {
        href: '/profil/recruteur',
        label: 'Profil',
        icon: IconUser,
        match: (p) => p.startsWith('/profil'),
      },
    ];
  }
  return [
    {
      href: '/',
      label: 'Accueil',
      icon: IconHome,
      match: (p) => p === '/',
    },
    {
      href: '/profil/candidat',
      label: 'Profil',
      icon: IconUser,
      match: (p) => p.startsWith('/profil'),
    },
  ];
}

/**
 * Coque mobile : topbar (logo + mode) + contenu + tabbar selon le mode actif.
 */
export function AppShellLayout({
  children,
  me,
  onModeChanged,
  title,
  hideTabbar,
  onLocationChanged,
}: AppShellLayoutProps) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const loggedIn = !!me;

  useEffect(() => {
    if (!me?.modesAvailable.canSwitch) return;
    const next = pageForMode(
      pathname,
      isEmployerMode(me) ? 'EMPLOYER' : 'WORKER',
    );
    if (next) router.replace(next);
  }, [me, pathname, router]);
  const tabs = tabsFor(me);
  const showTabbar = !hideTabbar && loggedIn;
  const [loggingOut, setLoggingOut] = useState(false);
  const [locationRevoked, setLocationRevoked] = useState(false);

  async function disableLocation() {
    const ok = await disableCurrentLocation();
    if (!ok) return;
    setLocationRevoked(true);
    onLocationChanged?.();
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await performLogout();
    } finally {
      // Navigation pleine page : même si on est déjà sur `/`, le shell invité se remonte.
      window.location.assign('/');
    }
  }

  return (
    <Box
      component="main"
      mih="100dvh"
      bg={tokens.color.surface.canvas}
      style={{
        display: 'flex',
        flexDirection: 'column',
        ['--bf-tabbar' as string]: showTabbar
          ? 'calc(4.75rem + env(safe-area-inset-bottom))'
          : 'env(safe-area-inset-bottom)',
      }}
    >
      <Box
        component="header"
        px="md"
        py="sm"
        style={{
          borderBottom: `1px solid ${tokens.color.border.subtle}`,
          background: tokens.color.surface.card,
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Container size={640} px={0}>
          {/* Ligne 1 : marque + actions — jamais de titre ici (évite le chevauchement mobile). */}
          <Group justify="space-between" wrap="nowrap" gap="xs" align="center">
            <Box style={{ minWidth: 0, flex: '1 1 auto' }}>
              <BrandLogo size="sm" href="/" />
            </Box>
            <Group gap={8} wrap="nowrap" justify="flex-end" style={{ flexShrink: 0 }}>
              {me?.modesAvailable.canSwitch && onModeChanged ? (
                <ModeSwitcher me={me} onChanged={onModeChanged} />
              ) : null}
              {loggedIn && me ? (
                <AccountMenu
                  me={{
                    ...me,
                    locationShared: me.locationShared && !locationRevoked,
                  }}
                  loggingOut={loggingOut}
                  onLogout={() => void logout()}
                  onDisableLocation={() => void disableLocation()}
                />
              ) : (
                <SessionAuthButton action="login" href="/connexion" />
              )}
            </Group>
          </Group>
          {/* Ligne 2 : titre de page — pleine largeur, tronqué proprement. */}
          {title ? (
            <Text
              component="p"
              size="sm"
              fw={700}
              mt={8}
              mb={0}
              truncate
              title={title}
              c={tokens.color.brand.ink}
              style={{ lineHeight: 1.3 }}
            >
              {title}
            </Text>
          ) : null}
        </Container>
      </Box>

      <Container
        size={640}
        px={{ base: 'md', sm: 'xl' }}
        py="md"
        style={{
          flex: 1,
          width: '100%',
          paddingBottom: 'var(--bf-tabbar)',
        }}
      >
        {loggedIn && me ? (
          <LocationConsent
            me={{
              ...me,
              locationShared: me.locationShared && !locationRevoked,
            }}
            onChanged={onLocationChanged}
          />
        ) : null}
        {children}
      </Container>

      {showTabbar ? (
        <Box
          component="nav"
          aria-label="Navigation principale"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 30,
            borderTop: `1px solid ${tokens.color.border.subtle}`,
            background: tokens.color.surface.card,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <Container size={640} px="md">
            <Group justify="space-around" py="xs" grow>
              {tabs.map((tab) => {
                const active = tab.match(pathname);
                const Icon = tab.icon;
                return (
                  <UnstyledButton
                    key={tab.href}
                    component={Link}
                    href={tab.href}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      minHeight: 44,
                      justifyContent: 'center',
                      color: active
                        ? tokens.color.brand.flash
                        : tokens.color.brand.inkMuted,
                      fontWeight: active ? 700 : 500,
                      fontSize: 12,
                    }}
                  >
                    <Icon size={22} stroke={2} aria-hidden />
                    {tab.label}
                  </UnstyledButton>
                );
              })}
            </Group>
          </Container>
        </Box>
      ) : null}
    </Box>
  );
}
