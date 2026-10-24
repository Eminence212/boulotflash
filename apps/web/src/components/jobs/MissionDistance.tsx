'use client';

import { useState } from 'react';
import { Stack, Text } from '@mantine/core';
import { IconMapPin, IconRefresh } from '@tabler/icons-react';
import { AppButton } from '@/components/feedback';
import {
  canRetry,
  geolocationFailure,
  geolocationFailureMessage,
  readBrowserPosition,
  type GeolocationFailure,
} from '@/lib/geolocation';
import { tokens } from '@/theme/tokens';
import { distanceLabelFromFix, type LatLng } from './mission-distance';

type Props = {
  latitude?: number | null;
  longitude?: number | null;
};

type State =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'located'; label: string }
  | { kind: 'failed'; failure: GeolocationFailure };

/**
 * Un clic, un calcul local. Les coordonnées du visiteur ne partent pas vers l’API.
 * Un échec temporaire de l’appareil se réessaie ; un refus renvoie aux réglages du navigateur.
 */
export function MissionDistance({ latitude, longitude }: Props) {
  const target: LatLng | null =
    latitude == null || longitude == null ? null : { latitude, longitude };
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function onLocate() {
    if (!target || state.kind === 'locating') return;
    setState({ kind: 'locating' });
    try {
      const pos = await readBrowserPosition(300_000);
      setState({
        kind: 'located',
        label: distanceLabelFromFix(
          { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          target,
        ),
      });
    } catch (err) {
      setState({ kind: 'failed', failure: geolocationFailure(err) });
    }
  }

  if (!target) {
    return (
      <Text size="sm" c="dimmed">
        {distanceLabelFromFix(null, null)}
      </Text>
    );
  }

  const failed = state.kind === 'failed' ? state.failure : null;
  const retry = failed !== null && canRetry(failed);

  return (
    <Stack gap={6}>
      <Text
        size="sm"
        aria-live="polite"
        c={failed ? tokens.color.status.alerte.fg : state.kind === 'located' ? undefined : 'dimmed'}
        fw={state.kind === 'located' ? 600 : undefined}
      >
        {state.kind === 'located'
          ? state.label
          : failed
            ? geolocationFailureMessage(failed)
            : 'Distance depuis votre position, calculée sur cet appareil.'}
      </Text>
      {state.kind !== 'located' && (failed === null || retry) ? (
        <AppButton
          variant="light"
          size="sm"
          w="fit-content"
          loading={state.kind === 'locating'}
          leftSection={
            retry ? <IconRefresh size={16} stroke={1.75} /> : <IconMapPin size={16} stroke={1.75} />
          }
          onClick={() => void onLocate()}
        >
          {retry ? 'Réessayer' : 'Ma position'}
        </AppButton>
      ) : null}
    </Stack>
  );
}
