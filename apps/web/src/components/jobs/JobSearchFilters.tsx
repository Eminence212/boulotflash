'use client';

import { useMemo } from 'react';
import {
  ActionIcon,
  Drawer,
  Group,
  Indicator,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconCalendar,
  IconSearch,
  IconX,
  IconAdjustmentsHorizontal,
} from '@tabler/icons-react';
import { AppChip } from '@/components/boulotflash/AppChip';
import { AppButton } from '@/components/feedback';
import { tokens } from '@/theme/tokens';

export type CatalogItem = { id: string; name: string; cityId?: string };

export type JobFilterValues = {
  q: string;
  cityId: string | null;
  communeId: string | null;
  categoryId: string | null;
  currency: string | null;
  date: string | null;
  todayOnly: boolean;
};

type JobSearchFiltersProps = {
  values: JobFilterValues;
  onChange: (next: JobFilterValues) => void;
  cities: CatalogItem[];
  communes: CatalogItem[];
  categories: CatalogItem[];
  resultCount: number;
  loading?: boolean;
  onApply: (next?: JobFilterValues) => void;
  onReset: () => void;
};

function labelOf(
  items: CatalogItem[],
  id: string | null,
): string | null {
  if (!id) return null;
  return items.find((i) => i.id === id)?.name ?? null;
}

export function JobSearchFilters({
  values,
  onChange,
  cities,
  communes,
  categories,
  resultCount,
  loading,
  onApply,
  onReset,
}: JobSearchFiltersProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 48em)');

  const commit = (next: JobFilterValues) => {
    onChange(next);
    return next;
  };

  const patch = (partial: Partial<JobFilterValues>) =>
    commit({ ...values, ...partial });

  const applyPatch = (partial: Partial<JobFilterValues>) => {
    onApply(commit({ ...values, ...partial }));
  };

  const communesForCity = useMemo(() => {
    if (!values.cityId) return communes;
    return communes.filter(
      (c) => !c.cityId || c.cityId === values.cityId,
    );
  }, [communes, values.cityId]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    const cityName = labelOf(cities, values.cityId);
    if (cityName) {
      chips.push({
        key: 'city',
        label: cityName,
        clear: () => applyPatch({ cityId: null, communeId: null }),
      });
    }
    const communeName = labelOf(communes, values.communeId);
    if (communeName) {
      chips.push({
        key: 'commune',
        label: communeName,
        clear: () => applyPatch({ communeId: null }),
      });
    }
    const catName = labelOf(categories, values.categoryId);
    if (catName) {
      chips.push({
        key: 'category',
        label: catName,
        clear: () => applyPatch({ categoryId: null }),
      });
    }
    if (values.currency) {
      chips.push({
        key: 'currency',
        label: values.currency,
        clear: () => applyPatch({ currency: null }),
      });
    }
    if (values.todayOnly) {
      chips.push({
        key: 'today',
        label: 'Aujourd’hui',
        clear: () => applyPatch({ todayOnly: false }),
      });
    } else if (values.date) {
      chips.push({
        key: 'date',
        label: values.date.split('-').reverse().join('/'),
        clear: () => applyPatch({ date: null }),
      });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, cities, communes, categories]);

  const advancedCount = activeChips.length;

  function applyAndClose() {
    onApply(values);
    close();
  }

  return (
    <Stack gap="sm">
      <Group gap="xs" wrap="nowrap" align="center">
        <TextInput
          flex={1}
          size="md"
          radius="md"
          placeholder="Rechercher une mission…"
          aria-label="Mots-clés"
          leftSection={<IconSearch size={18} stroke={1.75} aria-hidden />}
          value={values.q}
          onChange={(e) => patch({ q: e.currentTarget.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onApply(values);
          }}
        />
        <Indicator
          label={advancedCount > 0 ? advancedCount : undefined}
          size={16}
          color="flash"
          disabled={advancedCount === 0}
          offset={4}
          processing={false}
        >
          <ActionIcon
            variant="outline"
            color="flash"
            size={42}
            radius="md"
            aria-label="Ouvrir les filtres"
            onClick={open}
          >
            <IconAdjustmentsHorizontal size={20} stroke={2} aria-hidden />
          </ActionIcon>
        </Indicator>
      </Group>

      {activeChips.length > 0 ? (
        <Group gap={8} wrap="wrap">
          {activeChips.map((chip) => (
            <AppChip
              key={chip.key}
              checked
              variant="outline"
              aria-label={`Retirer le filtre ${chip.label}`}
              onChange={() => {
                chip.clear();
              }}
              icon={<IconX size={12} stroke={2} aria-hidden />}
            >
              {chip.label}
            </AppChip>
          ))}
          <AppButton variant="subtle" size="compact-xs" onClick={onReset}>
            Tout effacer
          </AppButton>
        </Group>
      ) : null}

      <Text
        size="xs"
        tt="uppercase"
        fw={700}
        c="dimmed"
        style={{ letterSpacing: '0.04em' }}
      >
        {resultCount} résultat{resultCount !== 1 ? 's' : ''}
      </Text>

      <Drawer
        opened={opened}
        onClose={close}
        position={isMobile ? 'bottom' : 'right'}
        size={isMobile ? 'auto' : 'md'}
        title={
          <Text
            fw={700}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Filtres
          </Text>
        }
        padding="md"
        radius={isMobile ? 'md' : 0}
        styles={{
          content: isMobile
            ? {
                maxHeight: '85dvh',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }
            : undefined,
          header: {
            borderBottom: `1px solid ${tokens.color.border.subtle}`,
          },
        }}
      >
        <Stack gap="md" pb="xl">
          <Select
            label="Ville"
            clearable
            searchable
            nothingFoundMessage="Aucune ville"
            placeholder="Toutes"
            data={cities.map((c) => ({ value: c.id, label: c.name }))}
            value={values.cityId}
            onChange={(v) => {
              const nextCommune =
                values.communeId &&
                communes.some(
                  (c) =>
                    c.id === values.communeId &&
                    (!v || !c.cityId || c.cityId === v),
                )
                  ? values.communeId
                  : null;
              patch({ cityId: v, communeId: nextCommune });
            }}
            comboboxProps={{ withinPortal: true }}
          />
          <Select
            label="Commune"
            clearable
            searchable
            nothingFoundMessage="Aucune commune"
            placeholder="Toutes (actives)"
            data={communesForCity.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            value={values.communeId}
            onChange={(v) => patch({ communeId: v })}
            comboboxProps={{ withinPortal: true }}
          />
          <Select
            label="Catégorie"
            clearable
            searchable
            nothingFoundMessage="Aucune catégorie"
            placeholder="Toutes"
            data={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={values.categoryId}
            onChange={(v) => patch({ categoryId: v })}
            comboboxProps={{ withinPortal: true }}
          />

          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Devise
            </Text>
            <SegmentedControl
              fullWidth
              value={values.currency ?? 'ALL'}
              onChange={(v) =>
                patch({ currency: v === 'ALL' ? null : v })
              }
              data={[
                { label: 'Toutes', value: 'ALL' },
                { label: 'USD', value: 'USD' },
                { label: 'CDF', value: 'CDF' },
              ]}
            />
          </Stack>

          <Switch
            label="Missions d’aujourd’hui"
            checked={values.todayOnly}
            onChange={(e) =>
              patch({
                todayOnly: e.currentTarget.checked,
                date: e.currentTarget.checked ? null : values.date,
              })
            }
          />

          <DatePickerInput
            label="Jour"
            placeholder="Choisir une date"
            clearable
            valueFormat="DD/MM/YYYY"
            locale="fr"
            disabled={values.todayOnly}
            value={values.date}
            onChange={(v) =>
              patch({
                date: typeof v === 'string' ? v : null,
                todayOnly: false,
              })
            }
            dropdownType={isMobile ? 'modal' : 'popover'}
            leftSection={<IconCalendar size={18} stroke={1.75} aria-hidden />}
          />

          <Text size="xs" c="dimmed">
            Pas de tri par prix (CDF et USD ne sont pas comparés). La distance
            se calcule sur le détail, sans envoyer votre position.
          </Text>

          <Group grow mt="sm">
            <AppButton
              variant="default"
              onClick={() => {
                onReset();
              }}
            >
              Réinitialiser
            </AppButton>
            <AppButton
              color="flash"
              loading={loading}
              onClick={applyAndClose}
            >
              Rechercher
            </AppButton>
          </Group>
        </Stack>
      </Drawer>
    </Stack>
  );
}
