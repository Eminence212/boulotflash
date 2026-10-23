'use client';

import { useEffect, useState } from 'react';
import {
  Checkbox,
  Group,
  MultiSelect,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import {
  PhoneField,
  isValidPilotPhoneInput,
} from '@/components/boulotflash/PhoneField';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import { SLOT_LABELS, WEEKDAY_LABELS } from '@/lib/me';
import { tokens } from '@/theme/tokens';

type CatalogItem = { id: string; name: string };

type SlotKey = `${number}:${string}`;

const SLOT_OPTIONS: { weekday: number; slot: string; label: string }[] = [];
for (let d = 1; d <= 7; d += 1) {
  for (const slot of ['MORNING', 'AFTERNOON', 'EVENING'] as const) {
    SLOT_OPTIONS.push({
      weekday: d,
      slot,
      label: `${WEEKDAY_LABELS[d]} · ${SLOT_LABELS[slot]}`,
    });
  }
}

export default function ProfilCandidatPage() {
  const { me, loading, refresh } = useMe({ requireAuth: true });
  const [communes, setCommunes] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
    <AppShellLayout
      me={me}
      title="Profil candidat"
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
                {form.values.displayName || 'Profil candidat'}
              </Title>
              <StatusBadge tone="soft">Candidat</StatusBadge>
            </Stack>
            <StatusBadge tone={complete ? 'succes' : 'attente'}>
              {complete ? 'Profil complet' : 'Incomplet'}
            </StatusBadge>
          </Group>
          {!complete && me.gaps.length > 0 ? (
            <Text size="sm" c="dimmed" mt="sm">
              Manques : {me.gaps.join(', ')}
            </Text>
          ) : null}
        </Paper>

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
        <Select
          label="Commune"
          placeholder="Choisir"
          searchable
          data={communes.map((c) => ({ value: c.id, label: c.name }))}
          value={form.values.communeId}
          onChange={(v) => form.setFieldValue('communeId', v)}
        />
        <Select
          label="Compétence principale"
          placeholder="Ex. Vente"
          searchable
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
          searchable
          data={categories.map((c) => ({ value: c.id, label: c.name }))}
          value={form.values.skillCategoryIds}
          onChange={(v) => form.setFieldValue('skillCategoryIds', v)}
        />

        <Switch
          label="Je suis disponible"
          description="Désactiver ne ferme pas le compte — la consultation reste possible."
          checked={form.values.isAvailable}
          onChange={(e) => void onToggleAvailable(e.currentTarget.checked)}
        />

        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Disponibilités
          </Text>
          <Paper
            radius="md"
            p="sm"
            withBorder
            style={{ borderColor: tokens.color.border.subtle }}
          >
            <Stack gap={6}>
              {SLOT_OPTIONS.filter((o) => o.weekday <= 6).map((opt) => {
                const key = `${opt.weekday}:${opt.slot}` as SlotKey;
                return (
                  <Checkbox
                    key={key}
                    label={opt.label}
                    checked={selectedSlots.has(key)}
                    onChange={() => toggleSlot(opt.weekday, opt.slot)}
                  />
                );
              })}
            </Stack>
          </Paper>
        </Stack>

        {error ? (
          <AppAlert tone="error" title="Profil">
            {error}
          </AppAlert>
        ) : null}

        <AppButton color="flash" loading={saving} onClick={() => void onSave()} fullWidth>
          Enregistrer
        </AppButton>
      </Stack>
    </AppShellLayout>
  );
}
