'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Group,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { BrandLogo, BRAND_LOGO_PAGE_SIZE } from '@/components/brand';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import {
  adminFetch,
  clearAdminAccessToken,
  readAdminAccessToken,
} from '@/lib/admin-api';
import { centsToMajor } from '@/lib/job-status';
import { tokens } from '@/theme/tokens';

type QueueItem = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  workersNeeded: number;
  atPrivateHome: boolean;
  employer: { id: string; displayName: string | null };
  category: { name: string; isSensitive: boolean; sensitiveIfHome: boolean };
  commune: { name: string };
};

export default function AdminHomePage() {
  const router = useRouter();
  const [scope, setScope] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {},
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    const { status, data } = await adminFetch<{ items?: QueueItem[]; message?: string }>(
      '/admin/jobs/review-queue',
    );
    if (status >= 400) {
      setError(data.message ?? 'File de modération inaccessible.');
      return;
    }
    setItems(data.items ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    const token = readAdminAccessToken();
    if (!token) {
      router.replace('/admin/connexion');
      return;
    }
    void (async () => {
      const { status, data } = await adminFetch<{ scope?: string }>('/admin/me');
      if (status >= 400 || !data.scope) {
        clearAdminAccessToken();
        router.replace('/admin/connexion');
        return;
      }
      setScope(data.scope);
      setReady(true);
      if (data.scope === 'MODERATOR' || data.scope === 'SUPER') {
        await loadQueue();
      }
    })();
  }, [router, loadQueue]);

  async function logout() {
    try {
      await adminFetch('/admin/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearAdminAccessToken();
    router.replace('/admin/connexion');
  }

  async function approve(id: string) {
    setBusyId(id);
    const { status, data } = await adminFetch<{ message?: string }>(
      `/admin/jobs/${id}/approve`,
      { method: 'POST', body: {} },
    );
    setBusyId(null);
    if (status >= 400) {
      setError(data.message ?? 'Validation impossible.');
      return;
    }
    await loadQueue();
  }

  async function reject(id: string) {
    const reason = (rejectReasons[id] ?? '').trim();
    if (reason.length < 3) {
      setError('Indiquez un motif de rejet (3 caractères minimum).');
      return;
    }
    setBusyId(id);
    const { status, data } = await adminFetch<{ message?: string }>(
      `/admin/jobs/${id}/reject`,
      { method: 'POST', body: { reason } },
    );
    setBusyId(null);
    if (status >= 400) {
      setError(data.message ?? 'Rejet impossible.');
      return;
    }
    setRejectReasons((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await loadQueue();
  }

  if (!ready) {
    return <GlobalLoader fullscreen message="Vérification de la session…" />;
  }

  const canModerate = scope === 'MODERATOR' || scope === 'SUPER';

  return (
    <Container size={640} py={{ base: 'xl', sm: 48 }}>
      <Stack gap="lg">
        <BrandLogo size={BRAND_LOGO_PAGE_SIZE} href="/admin" />
        <Title
          order={1}
          fz={24}
          fw={800}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Administration
        </Title>
        <Group gap="sm">
          <Text size="sm" c="dimmed">
            Session admin · scope {scope}
          </Text>
          <StatusBadge tone="soft">{scope ?? '—'}</StatusBadge>
        </Group>

        {error ? (
          <AppAlert tone="error" title="Admin">
            {error}
          </AppAlert>
        ) : null}

        {canModerate ? (
          <Stack gap="md">
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              c="dimmed"
              style={{ letterSpacing: '0.04em' }}
            >
              Modération offres · {items.length} en attente
            </Text>

            {items.length === 0 ? (
              <Text
                size="sm"
                p="md"
                style={{
                  border: `1px solid ${tokens.color.border.subtle}`,
                  borderRadius: 12,
                  background: tokens.color.surface.canvas,
                }}
              >
                File vide.
              </Text>
            ) : null}

            {items.map((job) => (
              <Stack
                key={job.id}
                gap="sm"
                p="md"
                style={{
                  border: `1px solid ${tokens.color.border.subtle}`,
                  borderRadius: 12,
                  background: tokens.color.surface.card,
                }}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div>
                    <Text fw={700}>
                      {job.title} — {job.employer.displayName ?? 'Recruteur'}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {job.category.name} · {job.commune.name} ·{' '}
                      {centsToMajor(job.amount)} {job.currency} ·{' '}
                      {job.workersNeeded} place
                      {job.workersNeeded > 1 ? 's' : ''}
                      {job.atPrivateHome ? ' · domicile' : ''}
                      {job.category.isSensitive ? ' · sensible' : ''}
                    </Text>
                  </div>
                  <StatusBadge tone="attente">À traiter</StatusBadge>
                </Group>
                <Textarea
                  label="Motif de rejet"
                  minRows={2}
                  placeholder="Ex. Tâche trop vague"
                  value={rejectReasons[job.id] ?? ''}
                  onChange={(e) =>
                    setRejectReasons((prev) => ({
                      ...prev,
                      [job.id]: e.currentTarget.value,
                    }))
                  }
                />
                <Group grow>
                  <AppButton
                    color="red"
                    variant="light"
                    loading={busyId === job.id}
                    disabled={!!busyId}
                    onClick={() => void reject(job.id)}
                  >
                    Rejeter
                  </AppButton>
                  <AppButton
                    color="flash"
                    loading={busyId === job.id}
                    disabled={!!busyId}
                    onClick={() => void approve(job.id)}
                  >
                    Valider
                  </AppButton>
                </Group>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            Scope {scope} : pas d’accès à la file de modération des offres.
          </Text>
        )}

        <AppButton variant="default" onClick={() => void logout()} w="fit-content">
          Déconnexion
        </AppButton>
      </Stack>
    </Container>
  );
}
