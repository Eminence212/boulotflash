'use client';

import { useEffect, useState } from 'react';
import { Group, Paper, Stack, Text } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { AppButton } from '@/components/feedback';
import { apiFetch, readAccessToken } from '@/lib/api';
import type { MeResponse } from '@/lib/me';
import { tokens } from '@/theme/tokens';

type LocationConsentProps = {
  me: MeResponse;
  /** Après enregistrement ou retrait, pour recharger le profil et la liste. */
  onChanged?: () => void;
};

function storageKey(token: string): string {
  return `bf_loc:${token.slice(-24)}`;
}

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 5 * 60_000,
      timeout: 12_000,
    });
  });
}

async function savePosition(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const { status, data } = await apiFetch<{ message?: string }>('/me/location', {
    method: 'PUT',
    accessToken: readAccessToken(),
    body: { consent: true, latitude, longitude },
  });
  if (status >= 400) return data.message ?? 'Position non enregistrée.';
  return null;
}

/** Retire l’accord et les coordonnées. Ne redemande pas dans cette session. */
export async function disableCurrentLocation(): Promise<boolean> {
  const token = readAccessToken();
  const { status } = await apiFetch('/me/location', {
    method: 'PUT',
    accessToken: token,
    body: { consent: false },
  });
  if (status >= 400) return false;
  if (token) sessionStorage.setItem(storageKey(token), 'later');
  return true;
}

/**
 * Accord volontaire. Si l’utilisateur a déjà accepté, la position
 * est actualisée une fois par connexion, sans nouveau dialogue.
 */
export function LocationConsent({ me, onChanged }: LocationConsentProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = readAccessToken();
    if (!token) return;
    const key = storageKey(token);
    const mark = sessionStorage.getItem(key);
    if (!me.locationShared) {
      if (mark === 'later' || mark === 'synced') return;
      setOpen(true);
      return;
    }
    if (mark === 'synced' || mark === 'pending') return;
    sessionStorage.setItem(key, 'pending');
    void refreshSavedPosition(key);
  }, [me.id, me.locationShared]);

  async function refreshSavedPosition(key: string) {
    try {
      const pos = await readPosition();
      const message = await savePosition(
        pos.coords.latitude,
        pos.coords.longitude,
      );
      sessionStorage.setItem(key, 'synced');
      if (!message) onChanged?.();
    } catch {
      sessionStorage.setItem(key, 'synced');
    }
  }

  async function accept() {
    const token = readAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const pos = await readPosition();
      const message = await savePosition(
        pos.coords.latitude,
        pos.coords.longitude,
      );
      setBusy(false);
      if (message) {
        setError(message);
        return;
      }
      sessionStorage.setItem(storageKey(token), 'synced');
      setOpen(false);
      onChanged?.();
    } catch {
      setBusy(false);
      setError(
        'Le navigateur n’a pas transmis la position. Vous pouvez continuer sans.',
      );
    }
  }

  function later() {
    const token = readAccessToken();
    if (token) sessionStorage.setItem(storageKey(token), 'later');
    setOpen(false);
  }

  if (!open) return null;

  return (
    <Paper
      component="section"
      aria-labelledby="bf-location-title"
      radius="md"
      p="md"
      mb="md"
      withBorder
      style={{ borderColor: tokens.color.brand.flashSoft }}
    >
      <Stack gap="sm">
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <IconMapPin
            size={20}
            stroke={1.75}
            color={tokens.color.brand.flash}
            aria-hidden
          />
          <Stack gap={4}>
            <Text id="bf-location-title" fw={700} size="sm">
              Missions les plus proches
            </Text>
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.45 }}>
              Si vous êtes d’accord, BoulotFlash enregistre votre position
              actuelle — à Kinshasa ou dans une autre ville de la RDC — et la
              remplace à chaque connexion. Une seule position, sans historique
              et sans suivi continu. Elle sert à afficher d’abord les missions
              les plus proches. Les autres utilisateurs ne la voient pas.
            </Text>
          </Stack>
        </Group>
        {error ? (
          <Text size="sm" c="red">
            {error}
          </Text>
        ) : null}
        <Group gap="sm" grow>
          <AppButton
            color="flash"
            loading={busy}
            onClick={() => void accept()}
            style={{ minHeight: 44 }}
          >
            Utiliser ma position
          </AppButton>
          <AppButton
            variant="default"
            disabled={busy}
            onClick={later}
            style={{ minHeight: 44 }}
          >
            Pas maintenant
          </AppButton>
        </Group>
      </Stack>
    </Paper>
  );
}
