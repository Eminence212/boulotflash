'use client';

import { useEffect, useState } from 'react';
import { MultiSelect, Select, Stack, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import {
  PhoneField,
  isValidPilotPhoneInput,
} from '@/components/boulotflash/PhoneField';
import { AvailabilityGrid } from '@/components/boulotflash/AvailabilityGrid';
import { ModeSwitchCard } from '@/components/boulotflash/ModeSwitchCard';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';

type CatalogItem = { id: string; name: string };

type SlotKey = `${number}:${string}`;

export default function ProfilCandidatPage() {
  const { me, loading, refresh } = useMe({ requireAuth: true });
  const [communes, setCommunes] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(new Set());

  const form = useForm({
    initialValues: {
      displayName: '',
      phone: '',
      communeId: '' as string | null,
      mainCategoryId: '' as string | null,
      skillCategoryIds: [] as string[],
      isAvailable: true,
    },
    validate: {
      phone: (v) =>
        isValidPilotPhoneInput(v)
          ? null
          : 'Numéro Kinshasa : +243 suivi de 9 chiffres.',
    },
  });

  useEffect(() => {
    void Promise.all([
      apiFetch<CatalogItem[] | { message?: string }>(
        '/catalog/communes?active=1',
      ),
      apiFetch<CatalogItem[] | { message?: string }>(
        '/catalog/categories?active=1',
      ),
    ]).then(([c, cat]) => {
      if (c.status < 400 && Array.isArray(c.data)) setCommunes(c.data);
      if (cat.status < 400 && Array.isArray(cat.data)) setCategories(cat.data);
    });
  }, []);

  useEffect(() => {
    if (!me) return;
    const wp = me.workerProfile;
    form.setValues({
      displayName: wp?.displayName ?? me.displayName ?? '',
      phone: me.phone ?? '',
      communeId: wp?.communeId ?? null,
      mainCategoryId: wp?.mainCategoryId ?? null,
      skillCategoryIds:
        wp?.skills?.map((s) => s.category.id) ??
        (wp?.mainCategoryId ? [wp.mainCategoryId] : []),
      isAvailable: wp?.isAvailable ?? true,
    });
    const slots = new Set<SlotKey>();
    for (const row of wp?.availability ?? []) {
      slots.add(`${row.weekday}:${row.slot}` as SlotKey);
    }
    setSelectedSlots(slots);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once me arrives
  }, [me?.id, me?.workerProfile?.id]);

  function toggleSlot(weekday: number, slot: string) {
    const key = `${weekday}:${slot}` as SlotKey;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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

    const availability = [...selectedSlots].map((key) => {
      const [weekday, slot] = key.split(':');
      return { weekday: Number(weekday), slot };
    });
    const { status, data } = await apiFetch('/me/worker-profile', {
      method: 'PUT',
      accessToken: token,
      body: {
        displayName: form.values.displayName.trim(),
        communeId: form.values.communeId || null,
        mainCategoryId: form.values.mainCategoryId || null,
        skillCategoryIds: form.values.skillCategoryIds,
        isAvailable: form.values.isAvailable,
        availability,
      },
    });
    setSaving(false);
    if (status >= 400) {
      setError(data.message ?? 'Enregistrement impossible.');
      return;
    }
    await refresh();
    setSaved(true);
  }

  async function onToggleAvailable(checked: boolean) {
    form.setFieldValue('isAvailable', checked);
    const token = readAccessToken();
    if (!token || !me?.workerProfile) return;
    await apiFetch('/me/worker-profile/availability', {
      method: 'PUT',
      accessToken: token,
      body: { isAvailable: checked },
    });
    await refresh();
  }

  if (loading || !me) {
    return <GlobalLoader fullscreen />;
  }

  const complete = me.workerProfileComplete;

  return (
    <AppShellLayout me={me}>
      <Stack gap="md">
        <PageHeader
          title="Profil candidat"
          description="Ces informations permettent aux recruteurs de vous retenir. Votre téléphone n’est jamais affiché publiquement."
          actions={
            <StatusBadge tone={complete ? 'succes' : 'attente'}>
              {complete ? 'Profil complet' : 'Incomplet'}
            </StatusBadge>
          }
        />

        <ModeSwitchCard me={me} onChanged={() => void refresh()} />

        {!complete && me.gaps.length > 0 ? (
          <AppAlert tone="warning" title="Pour pouvoir postuler">
            Il manque : {me.gaps.join(', ')}.
          </AppAlert>
        ) : null}

        <FormSection title="Identité" framed>
          <TextInput
            label="Nom affiché"
            description="Le nom que voient les recruteurs."
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
          <Select
            label="Commune"
            description="Là où vous habitez ou travaillez le plus souvent."
            placeholder="Choisir une commune"
            searchable
            nothingFoundMessage="Aucune commune"
            data={communes.map((c) => ({ value: c.id, label: c.name }))}
            value={form.values.communeId}
            onChange={(v) => form.setFieldValue('communeId', v)}
          />
        </FormSection>

        <FormSection title="Compétences" hint="Les missions de ces catégories vous correspondent." framed>
          <Select
            label="Compétence principale"
            placeholder="Ex. Vente"
            searchable
            nothingFoundMessage="Aucune catégorie"
            data={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={form.values.mainCategoryId}
            onChange={(v) => {
              form.setFieldValue('mainCategoryId', v);
              if (v && !form.values.skillCategoryIds.includes(v)) {
                form.setFieldValue('skillCategoryIds', [
                  ...form.values.skillCategoryIds,
                  v,
                ]);
              }
            }}
          />
          <MultiSelect
            label="Autres compétences"
            placeholder="Ajouter"
            searchable
            nothingFoundMessage="Aucune catégorie"
            data={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={form.values.skillCategoryIds}
            onChange={(v) => form.setFieldValue('skillCategoryIds', v)}
          />
        </FormSection>

        <FormSection title="Disponibilité" framed>
          <Switch
            size="md"
            label="Je suis disponible"
            description="Enregistré tout de suite. Désactivé, vous ne pouvez pas postuler mais vous consultez toujours les offres."
            checked={form.values.isAvailable}
            onChange={(e) => void onToggleAvailable(e.currentTarget.checked)}
          />
          <AvailabilityGrid selected={selectedSlots} onToggle={toggleSlot} />
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

        <AppButton color="flash" size="md" loading={saving} onClick={() => void onSave()} fullWidth>
          Enregistrer
        </AppButton>
      </Stack>
    </AppShellLayout>
  );
}
