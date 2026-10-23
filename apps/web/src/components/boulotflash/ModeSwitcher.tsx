'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SegmentedControl } from '@mantine/core';
import { apiFetch, readAccessToken } from '@/lib/api';
import type { MeResponse } from '@/lib/me';
import { pageForMode } from '@/lib/mode-route';

type ModeSwitcherProps = {
  me: MeResponse;
  onChanged: (mode: 'WORKER' | 'EMPLOYER') => void;
  disabled?: boolean;
};

/**
 * Sélecteur candidat / recruteur — visible seulement si les deux profils existent.
 */
export function ModeSwitcher({ me, onChanged, disabled }: ModeSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const [pending, setPending] = useState<'WORKER' | 'EMPLOYER' | null>(null);

  if (!me.modesAvailable.canSwitch) return null;

  const value = me.activeMode === 'EMPLOYER' ? 'EMPLOYER' : 'WORKER';

  async function switchMode(mode: string) {
    if (mode !== 'WORKER' && mode !== 'EMPLOYER') return;
    if (mode === (pending ?? value) || pending) return;
    const token = readAccessToken();
    if (!token) return;
    setPending(mode);
    const { status } = await apiFetch<{ activeMode?: string }>('/me/mode', {
      method: 'POST',
      accessToken: token,
      body: { mode },
    });
    setPending(null);
    if (status >= 400) return;
    const next = pageForMode(pathname, mode);
    if (next) router.push(next);
    onChanged(mode);
  }

  return (
    <SegmentedControl
      size="xs"
      value={pending ?? value}
      onChange={(v) => void switchMode(v)}
      disabled={disabled || pending !== null}
      data={[
        { label: 'Candidat', value: 'WORKER' },
        { label: 'Recruteur', value: 'EMPLOYER' },
      ]}
      aria-label="Mode actif"
    />
  );
}
