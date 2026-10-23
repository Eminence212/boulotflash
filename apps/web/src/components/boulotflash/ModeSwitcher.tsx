'use client';

import { SegmentedControl } from '@mantine/core';
import { apiFetch, readAccessToken } from '@/lib/api';
import type { MeResponse } from '@/lib/me';

type ModeSwitcherProps = {
  me: MeResponse;
  onChanged: (mode: 'WORKER' | 'EMPLOYER') => void;
  disabled?: boolean;
};

/**
 * Sélecteur candidat / recruteur — visible seulement si les deux profils existent.
 */
export function ModeSwitcher({ me, onChanged, disabled }: ModeSwitcherProps) {
  if (!me.modesAvailable.canSwitch) return null;

  const value = me.activeMode === 'EMPLOYER' ? 'EMPLOYER' : 'WORKER';

  async function switchMode(mode: string) {
    if (mode !== 'WORKER' && mode !== 'EMPLOYER') return;
    if (mode === value) return;
    const token = readAccessToken();
    if (!token) return;
    const { status } = await apiFetch<{ activeMode?: string }>('/me/mode', {
      method: 'POST',
      accessToken: token,
      body: { mode },
    });
    if (status < 400) onChanged(mode);
  }

  return (
    <SegmentedControl
      size="xs"
      value={value}
      onChange={(v) => void switchMode(v)}
      disabled={disabled}
      data={[
        { label: 'Candidat', value: 'WORKER' },
        { label: 'Recruteur', value: 'EMPLOYER' },
      ]}
      aria-label="Mode actif"
    />
  );
}
