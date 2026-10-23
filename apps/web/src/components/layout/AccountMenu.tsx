'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, Group, Menu, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconBriefcase,
  IconClipboardText,
  IconLogout,
  IconMapPinOff,
  IconPlus,
  IconUser,
  IconUserCheck,
} from '@tabler/icons-react';
import { EMPLOYER_TYPE_LABELS, isEmployerMode, type MeResponse } from '@/lib/me';
import { tokens } from '@/theme/tokens';

type AccountMenuProps = {
  me: MeResponse;
  loggingOut?: boolean;
  onLogout: () => void;
  onDisableLocation?: () => void;
};

type Entry = {
  href: string;
  label: string;
  icon: typeof IconUser;
  active: (path: string) => boolean;
};

function accountName(me: MeResponse, employer: boolean): string {
  const fromProfile = employer
    ? me.employerProfile?.displayName
    : me.workerProfile?.displayName;
  const name = fromProfile?.trim() || me.displayName?.trim();
  if (name) return name;
  const email = me.email?.split('@')[0]?.trim();
  return email || 'Compte';
}

function accountRole(me: MeResponse, employer: boolean): string {
  if (!employer) return 'Candidat';
  const kind = me.employerProfile?.type
    ? EMPLOYER_TYPE_LABELS[me.employerProfile.type]
    : null;
  return kind ? `Recruteur · ${kind}` : 'Recruteur';
}

/**
 * Photo du compte dans l’en-tête. Le clic ouvre le menu (profil, actions du mode, déconnexion).
 */
export function AccountMenu({
  me,
  loggingOut,
  onLogout,
  onDisableLocation,
}: AccountMenuProps) {
  const pathname = usePathname() ?? '/';
  const employer = isEmployerMode(me);
  const name = accountName(me, employer);
  const role = accountRole(me, employer);
  const initial = name.charAt(0).toUpperCase() || 'C';

  const entries: Entry[] = [
    {
      href: employer ? '/profil/recruteur' : '/profil/candidat',
      label: 'Profil',
      icon: IconUser,
      active: (path) =>
        path === (employer ? '/profil/recruteur' : '/profil/candidat'),
    },
  ];

  if (me.needsProfileCompletion) {
    entries.push({
      href: '/profil/completer',
      label: 'Compléter mon profil',
      icon: IconUserCheck,
      active: (path) => path.startsWith('/profil/completer'),
    });
  }

  if (!employer) {
    entries.push({
      href: '/candidatures',
      label: 'Mes candidatures',
      icon: IconClipboardText,
      active: (path) => path.startsWith('/candidatures'),
    });
  }

  if (employer) {
    entries.push(
      {
        href: '/missions',
        label: 'Mes missions',
        icon: IconBriefcase,
        active: (path) => path.startsWith('/missions'),
      },
      {
        href: '/publier',
        label: 'Créer une mission',
        icon: IconPlus,
        active: (path) => path.startsWith('/publier'),
      },
    );
  }

  return (
    <Menu
      width={280}
      position="bottom-end"
      offset={8}
      shadow="md"
      withinPortal
      zIndex={40}
      closeOnItemClick
      loop
    >
      <Menu.Target>
        <UnstyledButton
          aria-label={`Compte de ${name}`}
          aria-haspopup="menu"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 999,
            border: `2px solid ${tokens.color.brand.flashSoft}`,
          }}
          styles={{
            root: {
              '&[data-expanded]': {
                borderColor: tokens.color.brand.flash,
              },
              '&:focus-visible': {
                outline: `2px solid ${tokens.color.brand.flash}`,
                outlineOffset: 2,
              },
            },
          }}
        >
          <Avatar
            src={me.avatarUrl || undefined}
            alt=""
            radius="xl"
            size={36}
            color="flash"
            variant="light"
          >
            {initial}
          </Avatar>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown
        style={{
          border: `1px solid ${tokens.color.border.subtle}`,
          padding: 8,
          maxWidth: 'calc(100vw - 24px)',
        }}
      >
        <Group wrap="nowrap" gap="sm" px={8} py={8}>
          <Avatar
            src={me.avatarUrl || undefined}
            alt=""
            radius="xl"
            size={40}
            color="flash"
            variant="light"
          >
            {initial}
          </Avatar>
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text fw={700} size="sm" truncate>
              {name}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {role}
            </Text>
          </Stack>
        </Group>

        <Menu.Divider />

        {entries.map((entry) => {
          const Icon = entry.icon;
          const active = entry.active(pathname);
          return (
            <Menu.Item
              key={entry.href}
              component={Link}
              href={entry.href}
              leftSection={<Icon size={18} stroke={1.75} aria-hidden />}
              aria-current={active ? 'page' : undefined}
              style={{
                minHeight: 44,
                borderRadius: 8,
                fontWeight: active ? 700 : 500,
                color: active ? tokens.color.brand.flash : undefined,
              }}
            >
              {entry.label}
            </Menu.Item>
          );
        })}

        {me.locationShared && onDisableLocation ? (
          <Menu.Item
            leftSection={<IconMapPinOff size={18} stroke={1.75} aria-hidden />}
            onClick={onDisableLocation}
            style={{ minHeight: 44, borderRadius: 8 }}
          >
            Retirer ma position
          </Menu.Item>
        ) : null}

        <Menu.Divider />

        <Menu.Item
          color="red"
          disabled={loggingOut}
          leftSection={<IconLogout size={18} stroke={1.75} aria-hidden />}
          onClick={onLogout}
          style={{ minHeight: 44, borderRadius: 8 }}
        >
          {loggingOut ? 'Déconnexion…' : 'Déconnexion'}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
