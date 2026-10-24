'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Group, Select, SimpleGrid, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBriefcase, IconGift, IconPlus } from '@tabler/icons-react';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import {
  PhoneField,
  isValidPilotPhoneInput,
} from '@/components/boulotflash/PhoneField';
import { ModeSwitchCard } from '@/components/boulotflash/ModeSwitchCard';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
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
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
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
    setSaved(true);
  }

  if (loading || !me) {
    return <GlobalLoader fullscreen />;
  }

  const sub = me.subscription;
  const hasEmployer = !!me.employerProfile;
  const subActive = sub?.status === 'ACTIVE';

  return (
    <AppShellLayout me={me}>
      <Stack gap="md">
        <PageHeader
          title="Profil recruteur"
          description={
            hasEmployer
              ? 'Ce que voient les candidats sur vos offres. L’adresse et le téléphone restent privés.'
              : 'Créez votre profil pour publier des missions.'
          }
          actions={
            hasEmployer ? null : <StatusBadge tone="attente">À créer</StatusBadge>
          }
        />

        <ModeSwitchCard me={me} onChanged={() => void refresh()} />

        {hasEmployer && sub ? (
          <Stack
            gap="xs"
            p="md"
            style={{
              background: tokens.color.brand.flashSoft,
              border: `1px solid ${tokens.color.border.subtle}`,
              borderRadius: 16,
            }}
          >
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Group gap="sm" wrap="nowrap">
                <IconGift size={22} stroke={2} color={tokens.color.brand.flash} aria-hidden />
                <Text fw={700} size="sm">
                  {sub.label}
                </Text>
              </Group>
              <StatusBadge tone={subActive ? 'succes' : 'refus'}>
                {subActive ? 'Actif' : 'Inactif'}
              </StatusBadge>
            </Group>
            <Text size="sm" c="dimmed">
              {subActive
                ? 'Aucune demande de paiement pour publier tant que les services sont gratuits.'
                : 'Votre abonnement n’est pas actif : la publication est bloquée.'}
              {sub.endsAt
                ? ` Échéance : ${new Date(sub.endsAt).toLocaleDateString('fr-FR')}.`
                : ''}
            </Text>
          </Stack>
        ) : null}

        {hasEmployer && subActive ? (
          <SimpleGrid cols={2} spacing="sm">
            <Button
              component={Link}
              href="/missions"
              variant="default"
              leftSection={<IconBriefcase size={18} stroke={2} aria-hidden />}
            >
              Mes missions
            </Button>
            <Button
              component={Link}
              href="/publier"
              color="flash"
              leftSection={<IconPlus size={18} stroke={2} aria-hidden />}
            >
              Créer une mission
            </Button>
          </SimpleGrid>
        ) : null}

        <FormSection title="Identité" framed>
          <Select
            label="Vous êtes"
            data={Object.entries(EMPLOYER_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            allowDeselect={false}
            {...form.getInputProps('type')}
          />
          <TextInput
            label="Nom affiché"
            description="Le nom que voient les candidats sur vos offres."
            required
            {...form.getInputProps('displayName')}
          />
          <TextInput
            label="Nom du responsable"
            description="Facultatif. Utile pour une entreprise ou une organisation."
            {...form.getInputProps('contactPerson')}
          />
          <Textarea
            label="Présentation"
            description="Facultatif. Quelques mots sur votre activité."
            autosize
            minRows={2}
            {...form.getInputProps('presentation')}
          />
        </FormSection>

        <FormSection title="Contact et lieu" framed>
          <PhoneField
            value={form.values.phone}
            onChange={(v) => {
              form.setFieldValue('phone', v);
              form.clearFieldError('phone');
            }}
            error={form.errors.phone}
          />
          {!me.phone ? (
            <Text size="sm" c={tokens.color.status.alerte.fg} fw={600}>
              Numéro requis pour créer un profil recruteur.
            </Text>
          ) : null}
          <Select
            label="Commune"
            searchable
            placeholder="Choisir une commune"
            nothingFoundMessage="Aucune commune"
            data={communes.map((c) => ({ value: c.id, label: c.name }))}
            value={form.values.communeId}
            onChange={(v) => form.setFieldValue('communeId', v)}
          />
        </FormSection>

        {error ? (
          <AppAlert tone="error" title="Profil">
            {error}
          </AppAlert>
        ) : null}
        {saved && !error ? (
          <AppAlert tone="success" title="Profil enregistré">
            Vos modifications sont prises en compte.
          </AppAlert>
        ) : null}

        <AppButton
          color="flash"
          size="md"
          loading={saving}
          onClick={() => void onSave()}
          fullWidth
        >
          {hasEmployer ? 'Enregistrer' : 'Créer le profil recruteur'}
        </AppButton>
      </Stack>
    </AppShellLayout>
  );
}
