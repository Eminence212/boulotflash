'use client';

import { useState } from 'react';
import { Stack, Text } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { AppButton } from '@/components/feedback';
import { distanceLabelFromFix, type LatLng } from './mission-distance';

type Props = {
  latitude?: number | null;
  longitude?: number | null;
};

/**
 * Un clic, un calcul local. Les coordonnées du visiteur ne partent pas vers l’API.
 */
export function MissionDistance({ latitude, longitude }: Props) {
  const target: LatLng | null =
    latitude == null || longitude == null
      ? null
      : { latitude, longitude };
  const [label, setLabel] = useState(() => distanceLabelFromFix(null, target));
  const [asked, setAsked] = useState(false);

  function onLocate() {
    if (asked) return;
    setAsked(true);
    if (!target || typeof navigator === 'undefined' || !navigator.geolocation) {
      setLabel(distanceLabelFromFix(null, target));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLabel(
          distanceLabelFromFix(
            {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            },
            target,
          ),
        );
      },
      () => setLabel('position non partagée'),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 12_000 },
    );
  }

  return (
    <Stack gap={6}>
      <Text size="sm" c="dimmed" aria-live="polite">
        {label}
      </Text>
      <AppButton
        variant="light"
        size="sm"
        w="fit-content"
        leftSection={<IconMapPin size={16} stroke={1.75} />}
        onClick={onLocate}
        disabled={asked}
      >
        Ma position
      </AppButton>
    </Stack>
  );
}
