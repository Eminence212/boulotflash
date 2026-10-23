'use client';

import { useEffect, useState } from 'react';
import {
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconGift } from '@tabler/icons-react';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import {
  PhoneField,
  isValidPilotPhoneInput,
} from '@/components/boulotflash/PhoneField';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import { EMPLOYER_TYPE_LABELS } from '@/lib/me';
import { tokens } from '@/theme/tokens';

type CatalogItem = { id: string; name: string };

export default function ProfilRecruteurPage() {
  const { me, loading, refresh } = useMe({ requireAuth: true });
  const [communes, setCommunes] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    initialValues: {
      type: 'INDIVIDUAL',
      displayName: '',
      phone: '',
      contactPerson: '',
      communeId: '' as string | null,
      presentation: '',
    },
    validate: {
      phone: (v) =>
        isValidPilotPhoneInput(v)
          ? null
          : 'Numéro Kinshasa : +243 suivi de 9 chiffres.',
    },
  });

  useEffect(() => {
    void apiFetch<CatalogItem[] | { message?: string }>(
      '/catalog/communes?active=1',
    ).then(({ status, data }) => {
      if (status < 400 && Array.isArray(data)) setCommunes(data);
    });
  }, []);

  useEffect(() => {
    if (!me) return;
    const ep = me.employerProfile;
    form.setValues({
      type: ep?.type ?? 'INDIVIDUAL',
      displayName: ep?.displayName ?? me.displayName ?? '',
      phone: me.phone ?? '',
      contactPerson: ep?.contactPerson ?? '',
      communeId: ep?.communeId ?? null,
      presentation: ep?.presentation ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, me?.employerProfile?.id]);

  async function onSave() {
    setError(null);
    const validation = form.validate();
    if (validation.hasErrors) return;
    setSaving(true);
    const token = readAccessToken();
    if (!token) return;

    const phoneRes = await apiFetch('/me', {
      method: 'PATCH',
      accessToken: token,
      body: {
        displayName: form.values.displayName.trim(),
        phone: form.values.phone.trim(),
      },
    });
    if (phoneRes.status >= 400) {
      setSaving(false);
      setError(phoneRes.data.message ?? 'Téléphone ou nom impossible à enregistrer.');
      return;
    }

    const body = {
      type: form.values.type,
      displayName: form.values.displayName.trim(),
      contactPerson: form.values.contactPerson.trim() || null,
      communeId: form.values.communeId || null,
      presentation: form.values.presentation.trim() || null,
    };

    const { status, data } = await apiFetch('/me/employer-profile', {
      method: me?.employerProfile ? 'PUT' : 'POST',
      accessToken: token,
      body,
    });
    setSaving(false);
    if (status >= 400) {
      setError(data.message ?? 'Enregistrement impossible.');
      return;
    }
    await refresh();
  }

  if (loading || !me) {
    return <GlobalLoader fullscreen />;
  }

  const sub = me.subscription;
  const hasEmployer = !!me.employerProfile;
  const subActive = sub?.status === 'ACTIVE';

  return (
    <AppShellLayout
      me={me}
      title="Profil recruteur"
      onModeChanged={() => void refresh()}
    >
      <Stack gap="md">
        <Paper
          radius="lg"
          p="md"
          withBorder
          style={{ borderColor: tokens.color.border.subtle }}
        >
          <Group justify="space-between" align="flex-start" mb="sm">
            <Stack gap={4}>
              <Title order={2} fz={20} fw={800}>
                {form.values.displayName || 'Profil recruteur'}
              </Title>
              <StatusBadge tone="soft">Recruteur</StatusBadge>
            </Stack>
            {hasEmployer ? (
              <StatusBadge tone={subActive ? 'succes' : 'refus'}>
                {subActive ? 'Abonnement actif' : sub?.label ?? 'Inactif'}
              </StatusBadge>
            ) : (
              <StatusBadge tone="attente">À créer</StatusBadge>
            )}
          </Group>
          {me.employerProfile?.commune?.name ? (
            <Text size="sm" fw={600} mt="xs">
              {me.employerProfile.commune.name}
            </Text>
          ) : null}
        </Paper>

        {hasEmployer && subActive ? (
          <Paper
            radius="md"
            p="md"
            style={{
              background: tokens.color.brand.flashSoft,
              border: `1px solid ${tokens.color.border.subtle}`,
            }}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <IconGift size={22} stroke={2} color={tokens.color.brand.flash} aria-hidden />
              <Text size="sm" fw={600}>
                Services gratuits — aucune demande de paiement pour publier.
              </Text>
            </Group>
          </Paper>
        ) : null}

        {hasEmployer ? (
          <Paper
            radius="lg"
            p="md"
            withBorder
            style={{ borderColor: tokens.color.border.subtle }}
          >
            <Group justify="space-between">
              <Stack gap={2}>
                <Text fw={700} size="sm">
                  État commercial
                </Text>
                <Text size="xs" c="dimmed">
                  Interrupteur plateforme : services_payants = faux
                </Text>
              </Stack>
              <StatusBadge tone="soft">Gratuit</StatusBadge>
            </Group>
          </Paper>
        ) : null}

        {hasEmployer && sub ? (
          <Paper
            radius="lg"
            p="md"
            withBorder
            style={{ borderColor: tokens.color.border.subtle }}
          >
            <Group justify="space-between">
              <Stack gap={2}>
                <Text fw={700} size="sm">
                  Abonnement
                </Text>
                <Text size="xs" c="dimmed">
                  {sub.endsAt
                    ? `Échéance : ${new Date(sub.endsAt).toLocaleDateString('fr-FR')}`
                    : 'Droit d’accès actif, sans échéance affichée'}
                </Text>
              </Stack>
              <StatusBadge tone={subActive ? 'succes' : 'refus'}>
                {sub.status}
              </StatusBadge>
            </Group>
          </Paper>
        ) : null}

        <Select
          label="Type"
          data={Object.entries(EMPLOYER_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          {...form.getInputProps('type')}
        />
        <TextInput
          label="Nom affiché"
          required
          {...form.getInputProps('displayName')}
        />
        <PhoneField
          value={form.values.phone}
          onChange={(v) => {
            form.setFieldValue('phone', v);
            form.clearFieldError('phone');
          }}
          error={form.errors.phone}
        />
        {!me.phone ? (
          <AppAlert tone="warning" title="Téléphone requis">
            Indiquez un numéro ci-dessus puis enregistrez — requis pour créer un
            profil recruteur.
          </AppAlert>
        ) : null}
        <TextInput
          label="Nom du responsable"
          {...form.getInputProps('contactPerson')}
        />
        <Select
          label="Commune"
          searchable
          placeholder="Choisir"
          data={communes.map((c) => ({ value: c.id, label: c.name }))}
          value={form.values.communeId}
          onChange={(v) => form.setFieldValue('communeId', v)}
        />
        <Textarea
          label="Présentation"
          minRows={2}
          {...form.getInputProps('presentation')}
        />

        {error ? (
          <AppAlert tone="error" title="Profil">
            {error}
          </AppAlert>
        ) : null}

        <AppButton
          color="flash"
          loading={saving}
          onClick={() => void onSave()}
          fullWidth
        >
          {hasEmployer ? 'Enregistrer' : 'Créer le profil recruteur'}
        </AppButton>

        {hasEmployer && subActive ? (
          <Group grow>
            <AppButton
              variant="outline"
              color="flash"
              onClick={() => {
                window.location.assign('/missions');
              }}
            >
              Mes missions
            </AppButton>
            <AppButton
              color="flash"
              onClick={() => {
                window.location.assign('/publier');
              }}
            >
              Créer
            </AppButton>
          </Group>
        ) : null}
      </Stack>
    </AppShellLayout>
  );
}
