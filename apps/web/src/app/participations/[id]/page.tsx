'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button, Group, Modal, Paper, Stack, Text } from '@mantine/core';
import { IconBrandWhatsapp, IconLock, IconMapPin, IconPhone } from '@tabler/icons-react';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import { formatMoney, formatStartAt, payUnitLabel } from '@/lib/me';
import { tokens } from '@/theme/tokens';

const PrivateMissionMap = dynamic(
  () => import('@/components/jobs/PublicMissionMap').then((mod) => mod.PrivateMissionMap),
  { ssr: false },
);

type Contact = {
  participationId: string;
  viewer: 'WORKER' | 'EMPLOYER';
  counterpart: { role: 'WORKER' | 'EMPLOYER'; displayName: string; phone: string | null };
  addressPrivate: string | null;
  privateLatitude: number | null;
  privateLongitude: number | null;
  job: {
    id: string;
    title: string;
    startAt: string;
    durationHours: number;
    amount: number;
    currency: string;
    payUnit: string;
    commune: string;
  };
};

/** « +243 820 000 002 » : lisible à voix haute. */
function displayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('243')) {
    return `+243 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
}

export default function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, loading } = useMe({ requireAuth: true });
  const [contact, setContact] = useState<Contact | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'revoked' | 'error'>('loading');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelKey = useRef<string | null>(null);

  // Toujours une nouvelle lecture : jamais l’adresse d’une ancienne réponse (D11, retour arrière).
  const load = useCallback(async () => {
    const token = readAccessToken();
    if (!token) return;
    try {
      const { status, data } = await apiFetch<Contact>(`/participations/${id}/contact`, {
        accessToken: token,
        cache: 'no-store',
      });
      if (status === 404) {
        setContact(null);
        setState('revoked');
        return;
      }
      if (status >= 400) {
        setContact(null);
        setState('error');
        return;
      }
      setContact(data);
      setState('ready');
    } catch {
      setContact(null);
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    if (loading) return;
    void load();
    // Page restaurée depuis le cache du navigateur (bouton retour) : on relit le contact.
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setContact(null);
        setState('loading');
        void load();
      }
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [loading, load]);

  async function cancelParticipation() {
    const token = readAccessToken();
    if (!token || busy) return;
    cancelKey.current ??= crypto.randomUUID();
    setBusy(true);
    setError(null);
    try {
      const { status, data } = await apiFetch<{ message?: string }>(`/participations/${id}/declarations`, {
        method: 'POST',
        accessToken: token,
        headers: { 'Idempotency-Key': cancelKey.current },
        body: { outcome: 'CANCELLED' },
      });
      if (status >= 400) {
        setError(data.message ?? 'Annulation impossible.');
        return;
      }
      setConfirming(false);
      await load();
    } catch {
      setError('Non envoyé. Vérifiez votre connexion puis réessayez.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !me || state === 'loading') {
    return <GlobalLoader fullscreen />;
  }

  const backHref = contact
    ? contact.viewer === 'EMPLOYER'
      ? `/missions/${contact.job.id}/candidatures`
      : `/missions/${contact.job.id}`
    : '/';

  return (
    <AppShellLayout me={me}>
      <Stack gap="md">
        <PageHeader
          back={{ href: backHref, label: contact ? 'Retour à la mission' : 'Accueil' }}
          title="Coordonnées"
          description="Visibles seulement par vous et l’autre partie, après acceptation. Absentes du détail public."
        />

        {state === 'revoked' ? (
          <EmptyState
            icon={IconLock}
            title="Accès aux coordonnées retiré"
            description="La participation a été annulée, ou ces coordonnées ne vous concernent pas. Le numéro et l’adresse ne sont plus affichés."
            action={{ label: 'Voir les missions', href: '/' }}
          />
        ) : null}

        {state === 'error' ? (
          <AppAlert tone="error" title="Coordonnées">
            Coordonnées indisponibles pour le moment. Vérifiez votre connexion puis rouvrez la page.
          </AppAlert>
        ) : null}

        {contact ? (
          <>
            <Paper radius="lg" p="md" withBorder style={{ borderColor: tokens.color.border.subtle }}>
              <Stack gap={4}>
                <Text fw={700}>{contact.job.title}</Text>
                <Text size="sm">
                  <Text span fw={700}>
                    {formatMoney(contact.job.amount, contact.job.currency)}
                  </Text>{' '}
                  <Text span c="dimmed">
                    {payUnitLabel(contact.job.payUnit)}
                  </Text>
                </Text>
                <Text size="sm" fw={600}>
                  {formatStartAt(contact.job.startAt)} · {contact.job.durationHours} h · {contact.job.commune}
                </Text>
              </Stack>
            </Paper>

            <Paper radius="lg" p="md" withBorder style={{ borderColor: tokens.color.border.subtle }}>
              <Stack gap="sm">
                <Group gap={8} wrap="nowrap" align="flex-start">
                  <IconMapPin size={20} stroke={2} color={tokens.color.brand.flash} aria-hidden />
                  <Stack gap={2}>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.04em' }}>
                      Adresse exacte
                    </Text>
                    <Text fw={600}>{contact.addressPrivate ?? 'Adresse non renseignée par le recruteur.'}</Text>
                  </Stack>
                </Group>
                <PrivateMissionMap latitude={contact.privateLatitude} longitude={contact.privateLongitude} />
              </Stack>
            </Paper>

            <Paper radius="lg" p="md" withBorder style={{ borderColor: tokens.color.border.subtle }}>
              <Stack gap="sm">
                <Stack gap={2}>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: '0.04em' }}>
                    {contact.counterpart.role === 'EMPLOYER' ? 'Téléphone du recruteur' : 'Téléphone du candidat'}
                  </Text>
                  <Text fw={700} fz="lg">
                    {contact.counterpart.phone ? displayPhone(contact.counterpart.phone) : 'Numéro non renseigné'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {contact.counterpart.displayName}
                  </Text>
                </Stack>
                {contact.counterpart.phone ? (
                  <Group grow gap="xs">
                    <Button
                      component="a"
                      href={`tel:+${contact.counterpart.phone.replace(/\D/g, '')}`}
                      color="flash"
                      leftSection={<IconPhone size={18} stroke={2} aria-hidden />}
                    >
                      Appeler
                    </Button>
                    <AppButton
                      variant="outline"
                      color="flash"
                      leftSection={<IconBrandWhatsapp size={18} stroke={2} aria-hidden />}
                      onClick={() => {
                        // Aucun message prérempli, aucun appel serveur : WhatsApp s’ouvre, c’est tout.
                        window.open(
                          `https://wa.me/${contact.counterpart.phone!.replace(/\D/g, '')}`,
                          '_blank',
                          'noopener,noreferrer',
                        );
                      }}
                    >
                      WhatsApp
                    </AppButton>
                  </Group>
                ) : null}
                <Text size="xs" c="dimmed">
                  WhatsApp s’ouvre sans message prérempli : rien n’est envoyé automatiquement.
                </Text>
              </Stack>
            </Paper>

            {error ? (
              <AppAlert tone="error" title="Annulation">
                {error}
              </AppAlert>
            ) : null}

            <AppButton variant="default" c="red" onClick={() => setConfirming(true)}>
              {contact.viewer === 'EMPLOYER' ? 'Annuler la participation' : 'Annuler ma participation'}
            </AppButton>
          </>
        ) : null}
      </Stack>

      <Modal
        opened={confirming}
        onClose={() => (busy ? undefined : setConfirming(false))}
        title="Annuler la participation ?"
        centered
        radius="lg"
      >
        <Stack gap="md">
          <Text size="sm">
            L’autre partie est prévenue dans l’application, et les coordonnées ne seront plus visibles,
            ni pour vous ni pour elle. La place redevient disponible. Si vous pouvez encore venir,
            appelez plutôt pour vous arranger.
          </Text>
          <Group justify="flex-end" gap="sm">
            <AppButton variant="default" disabled={busy} onClick={() => setConfirming(false)}>
              Garder
            </AppButton>
            <AppButton color="red" loading={busy} onClick={() => void cancelParticipation()}>
              Annuler la participation
            </AppButton>
          </Group>
        </Stack>
      </Modal>
    </AppShellLayout>
  );
}
