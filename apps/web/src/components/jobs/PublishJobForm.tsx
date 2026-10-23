'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useMediaQuery } from '@mantine/hooks';
import { IconCalendar } from '@tabler/icons-react';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import { tokens } from '@/theme/tokens';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { apiFetch, readAccessToken } from '@/lib/api';
import {
  centsToMajor,
  defaultMissionDates,
  fromDatetimeLocalValue,
  jobStatusLabel,
  jobStatusTone,
  majorToCents,
  toDatetimeLocalValue,
} from '@/lib/job-status';

type CatalogCategory = {
  id: string;
  name: string;
  isSensitive?: boolean;
  sensitiveIfHome?: boolean;
};
type CatalogCommune = { id: string; name: string };

type JobOwnerView = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  communeId: string;
  publicLandmark: string | null;
  addressPrivate: string | null;
  atPrivateHome: boolean;
  startAt: string;
  durationHours: number;
  workersNeeded: number;
  amount: number;
  currency: string;
  payUnit: string;
  payChannel: string;
  payTiming: string | null;
  skillsRequired: string | null;
  materialConditions: string | null;
  transportSupport: boolean;
  mealsSupport: boolean;
  equipmentSupport: boolean;
  applyDeadline: string;
  selectionDeadline: string;
  status: string;
  rejectionReason: string | null;
};

type FormValues = {
  title: string;
  description: string;
  categoryId: string | null;
  communeId: string | null;
  publicLandmark: string;
  addressPrivate: string;
  atPrivateHome: boolean;
  startAt: string;
  durationHours: number;
  workersNeeded: number;
  amountMajor: string;
  currency: string;
  payUnit: string;
  payChannel: string;
  payTiming: string;
  skillsRequired: string;
  materialConditions: string;
  transportSupport: boolean;
  mealsSupport: boolean;
  equipmentSupport: boolean;
  applyDeadline: string;
  selectionDeadline: string;
};

function emptyValues(): FormValues {
  const dates = defaultMissionDates();
  return {
    title: '',
    description: '',
    categoryId: null,
    communeId: null,
    publicLandmark: '',
    addressPrivate: '',
    atPrivateHome: false,
    startAt: dates.startAt,
    durationHours: 4,
    workersNeeded: 1,
    amountMajor: '',
    currency: 'USD',
    payUnit: 'MISSION',
    payChannel: 'CASH',
    payTiming: 'Fin de mission',
    skillsRequired: '',
    materialConditions: '',
    transportSupport: false,
    mealsSupport: false,
    equipmentSupport: false,
    applyDeadline: dates.applyDeadline,
    selectionDeadline: dates.selectionDeadline,
  };
}

function fromJob(job: JobOwnerView): FormValues {
  return {
    title: job.title === '(brouillon)' ? '' : job.title,
    description: job.description,
    categoryId: job.categoryId,
    communeId: job.communeId,
    publicLandmark: job.publicLandmark ?? '',
    addressPrivate: job.addressPrivate ?? '',
    atPrivateHome: job.atPrivateHome,
    startAt: toDatetimeLocalValue(job.startAt),
    durationHours: job.durationHours,
    workersNeeded: job.workersNeeded,
    amountMajor: centsToMajor(job.amount),
    currency: job.currency,
    payUnit: job.payUnit,
    payChannel: job.payChannel,
    payTiming: job.payTiming ?? '',
    skillsRequired: job.skillsRequired ?? '',
    materialConditions: job.materialConditions ?? '',
    transportSupport: job.transportSupport,
    mealsSupport: job.mealsSupport,
    equipmentSupport: job.equipmentSupport,
    applyDeadline: toDatetimeLocalValue(job.applyDeadline),
    selectionDeadline: toDatetimeLocalValue(job.selectionDeadline),
  };
}

function toDraftBody(values: FormValues) {
  const amount = majorToCents(values.amountMajor);
  return {
    title: values.title.trim() || undefined,
    description: values.description.trim() || undefined,
    categoryId: values.categoryId ?? undefined,
    communeId: values.communeId ?? undefined,
    publicLandmark: values.publicLandmark.trim() || null,
    addressPrivate: values.addressPrivate.trim() || null,
    atPrivateHome: values.atPrivateHome,
    startAt: fromDatetimeLocalValue(values.startAt),
    durationHours: values.durationHours,
    workersNeeded: values.workersNeeded,
    amount: amount ?? 0,
    currency: values.currency as 'CDF' | 'USD',
    payUnit: values.payUnit as 'HOUR' | 'DAY' | 'MISSION',
    payChannel: values.payChannel as 'CASH' | 'MOBILE_MONEY',
    payTiming: values.payTiming.trim() || null,
    skillsRequired: values.skillsRequired.trim() || null,
    materialConditions: values.materialConditions.trim() || null,
    transportSupport: values.transportSupport,
    mealsSupport: values.mealsSupport,
    equipmentSupport: values.equipmentSupport,
    applyDeadline: fromDatetimeLocalValue(values.applyDeadline),
    selectionDeadline: fromDatetimeLocalValue(values.selectionDeadline),
  };
}

type PublishJobFormProps = {
  initialJobId?: string | null;
};

function pickerDate(local: string): Date | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fromPicker(value: string | Date | null): string {
  if (!value) return '';
  const raw = value instanceof Date ? value.toISOString() : value.replace(' ', 'T');
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return toDatetimeLocalValue(d.toISOString());
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Stack gap="sm">
      <Stack gap={2}>
        <Text
          size="xs"
          tt="uppercase"
          fw={700}
          c="dimmed"
          style={{ letterSpacing: '0.04em' }}
        >
          {title}
        </Text>
        {hint ? (
          <Text size="sm" c="dimmed">
            {hint}
          </Text>
        ) : null}
      </Stack>
      {children}
    </Stack>
  );
}

export function PublishJobForm({ initialJobId = null }: PublishJobFormProps) {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [communes, setCommunes] = useState<CatalogCommune[]>([]);
  const [jobId, setJobId] = useState<string | null>(initialJobId);
  const [status, setStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);
  const [loaded, setLoaded] = useState(!initialJobId);

  const form = useForm<FormValues>({
    initialValues: emptyValues(),
  });

  useEffect(() => {
    void Promise.all([
      apiFetch<CatalogCategory[]>('/catalog/categories?active=1'),
      apiFetch<CatalogCommune[]>('/catalog/communes?active=1'),
    ]).then(([cats, coms]) => {
      if (cats.status < 400 && Array.isArray(cats.data)) setCategories(cats.data);
      if (coms.status < 400 && Array.isArray(coms.data)) setCommunes(coms.data);
    });
  }, []);

  useEffect(() => {
    if (!initialJobId) return;
    const token = readAccessToken();
    if (!token) return;
    void apiFetch<JobOwnerView>(`/jobs/${initialJobId}`, {
      accessToken: token,
    }).then(({ status: http, data }) => {
      if (http >= 400) {
        setError(data.message ?? 'Offre introuvable.');
        setLoaded(true);
        return;
      }
      form.setValues(fromJob(data));
      setJobId(data.id);
      setStatus(data.status);
      setRejectionReason(data.rejectionReason);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJobId]);

  async function persistDraft(): Promise<JobOwnerView | null> {
    const token = readAccessToken();
    if (!token) {
      setError('Session expirée. Reconnectez-vous.');
      return null;
    }
    if (!form.values.categoryId || !form.values.communeId) {
      setError('Choisissez une catégorie et une commune.');
      return null;
    }
    const body = toDraftBody(form.values);
    if (jobId) {
      const { status: http, data } = await apiFetch<JobOwnerView>(
        `/jobs/${jobId}`,
        { method: 'PUT', accessToken: token, body },
      );
      if (http >= 400) {
        setError(data.message ?? 'Enregistrement impossible.');
        return null;
      }
      return data;
    }
    const { status: http, data } = await apiFetch<JobOwnerView>('/jobs', {
      method: 'POST',
      accessToken: token,
      body,
    });
    if (http >= 400) {
      setError(data.message ?? 'Création du brouillon impossible.');
      return null;
    }
    return data;
  }

  async function saveDraft() {
    setBusy('draft');
    setError(null);
    setInfo(null);
    try {
      const saved = await persistDraft();
      if (!saved) return;
      setJobId(saved.id);
      setStatus(saved.status);
      setRejectionReason(saved.rejectionReason);
      setInfo('Brouillon enregistré.');
      if (!initialJobId && saved.id) {
        router.replace(`/publier/${saved.id}`);
      }
    } catch {
      setError('Non envoyé. Vérifiez la connexion puis réessayez.');
    } finally {
      setBusy(null);
    }
  }

  async function submitPublish() {
    setBusy('submit');
    setError(null);
    setInfo(null);
    try {
      const saved = await persistDraft();
      if (!saved) return;
      setJobId(saved.id);
      setStatus(saved.status);
      setRejectionReason(saved.rejectionReason);

      // Modification substantielle d’une offre publiée → déjà IN_REVIEW côté API.
      if (saved.status === 'IN_REVIEW') {
        setInfo('Modification envoyée en modération.');
        router.push('/missions');
        return;
      }
      if (saved.status === 'PUBLISHED') {
        setInfo('Modifications enregistrées.');
        router.push('/missions');
        return;
      }

      const token = readAccessToken();
      if (!token) {
        setError('Session expirée. Reconnectez-vous.');
        return;
      }
      const { status: http, data } = await apiFetch<{
        id?: string;
        status?: string;
        message?: string;
        code?: string;
      }>(`/jobs/${saved.id}/submit`, {
        method: 'POST',
        accessToken: token,
      });
      if (http >= 400) {
        setError(data.message ?? 'Soumission refusée.');
        return;
      }
      const next = data.status ?? saved.status;
      setStatus(next);
      setRejectionReason(null);
      if (next === 'PUBLISHED') {
        setInfo('Mission publiée.');
        router.push('/missions');
        return;
      }
      setInfo('Offre envoyée en modération.');
      router.push('/missions');
    } catch {
      setError('Non envoyé. Vérifiez la connexion puis réessayez.');
    } finally {
      setBusy(null);
    }
  }

  if (!loaded) {
    return <GlobalLoader fullscreen message="Chargement du brouillon…" />;
  }

  const editable =
    !status || status === 'DRAFT' || status === 'REJECTED' || status === 'PUBLISHED';
  const dateDropdown = isMobile ? 'modal' : 'popover';

  function setWhen(field: 'startAt' | 'applyDeadline' | 'selectionDeadline') {
    return (value: string | Date | null) => {
      form.setFieldValue(field, fromPicker(value));
    };
  }

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
    <Stack gap="md" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {status ? (
        <Group gap="sm">
          <StatusBadge tone={jobStatusTone(status)}>
            {jobStatusLabel(status)}
          </StatusBadge>
          {status === 'PUBLISHED' ? (
            <Text size="xs" c="dimmed">
              Une modification importante repasse en modération.
            </Text>
          ) : null}
        </Group>
      ) : null}

      {rejectionReason ? (
        <AppAlert tone="error" title="Motif de rejet">
          {rejectionReason}
        </AppAlert>
      ) : null}

      <FormSection title="La mission" hint="Ce que la personne verra en premier.">
        <TextInput
          label="Titre"
          required
          disabled={!editable}
          {...form.getInputProps('title')}
        />
        <Select
          label="Catégorie"
          required
          searchable
          nothingFoundMessage="Aucune catégorie"
          disabled={!editable}
          placeholder="Choisir"
          data={categories.map((c) => ({ value: c.id, label: c.name }))}
          value={form.values.categoryId}
          onChange={(v) => form.setFieldValue('categoryId', v)}
          comboboxProps={{ withinPortal: true }}
        />
        <Textarea
          label="Description"
          required
          minRows={3}
          autosize
          disabled={!editable}
          {...form.getInputProps('description')}
        />
      </FormSection>

      <FormSection title="Rémunération" hint="Le montant et la devise restent séparés.">
        <TextInput
          label={`Montant (${form.values.currency})`}
          required
          inputMode="decimal"
          disabled={!editable}
          {...form.getInputProps('amountMajor')}
        />
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Devise
          </Text>
          <SegmentedControl
            fullWidth
            disabled={!editable}
            value={form.values.currency}
            onChange={(v) => form.setFieldValue('currency', v)}
            data={[
              { label: 'USD', value: 'USD' },
              { label: 'CDF', value: 'CDF' },
            ]}
          />
        </Stack>
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Base de rémunération
          </Text>
          <SegmentedControl
            fullWidth
            disabled={!editable}
            value={form.values.payUnit}
            onChange={(v) => form.setFieldValue('payUnit', v)}
            data={[
              { label: 'Mission', value: 'MISSION' },
              { label: 'Heure', value: 'HOUR' },
              { label: 'Journée', value: 'DAY' },
            ]}
          />
        </Stack>
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Paiement prévu
          </Text>
          <SegmentedControl
            fullWidth
            disabled={!editable}
            value={form.values.payChannel}
            onChange={(v) => form.setFieldValue('payChannel', v)}
            data={[
              { label: 'Espèces', value: 'CASH' },
              { label: 'Mobile money', value: 'MOBILE_MONEY' },
            ]}
          />
        </Stack>
        <TextInput
          label="Moment du paiement"
          disabled={!editable}
          {...form.getInputProps('payTiming')}
        />
      </FormSection>

      <FormSection title="Quand" hint="Les dates s’ouvrent dans le calendrier.">
        <SimpleGrid cols={2} spacing="sm">
          <NumberInput
            label="Places"
            min={1}
            max={20}
            hideControls
            disabled={!editable}
            value={form.values.workersNeeded}
            onChange={(v) =>
              form.setFieldValue(
                'workersNeeded',
                typeof v === 'number' ? v : Number(v) || 1,
              )
            }
          />
          <NumberInput
            label="Durée (heures)"
            min={1}
            max={336}
            hideControls
            disabled={!editable}
            value={form.values.durationHours}
            onChange={(v) =>
              form.setFieldValue(
                'durationHours',
                typeof v === 'number' ? v : Number(v) || 1,
              )
            }
          />
        </SimpleGrid>
        <DateTimePicker
          label="Début"
          required
          disabled={!editable}
          placeholder="Choisir la date et l’heure"
          valueFormat="DD/MM/YYYY HH:mm"
          locale="fr"
          dropdownType={dateDropdown}
          leftSection={<IconCalendar size={18} stroke={1.75} aria-hidden />}
          value={pickerDate(form.values.startAt)}
          onChange={setWhen('startAt')}
        />
        <DateTimePicker
          label="Limite de candidature"
          required
          disabled={!editable}
          placeholder="Choisir la date et l’heure"
          valueFormat="DD/MM/YYYY HH:mm"
          locale="fr"
          dropdownType={dateDropdown}
          leftSection={<IconCalendar size={18} stroke={1.75} aria-hidden />}
          value={pickerDate(form.values.applyDeadline)}
          onChange={setWhen('applyDeadline')}
        />
        <DateTimePicker
          label="Clôture des sélections"
          required
          disabled={!editable}
          placeholder="Choisir la date et l’heure"
          valueFormat="DD/MM/YYYY HH:mm"
          locale="fr"
          dropdownType={dateDropdown}
          leftSection={<IconCalendar size={18} stroke={1.75} aria-hidden />}
          value={pickerDate(form.values.selectionDeadline)}
          onChange={setWhen('selectionDeadline')}
        />
      </FormSection>

      <FormSection
        title="Lieu"
        hint="Le repère public est visible. L’adresse exacte reste privée."
      >
        <Select
          label="Commune"
          required
          searchable
          nothingFoundMessage="Aucune commune"
          disabled={!editable}
          placeholder="Choisir"
          data={communes.map((c) => ({ value: c.id, label: c.name }))}
          value={form.values.communeId}
          onChange={(v) => form.setFieldValue('communeId', v)}
          comboboxProps={{ withinPortal: true }}
        />
        <TextInput
          label="Repère public"
          disabled={!editable}
          {...form.getInputProps('publicLandmark')}
        />
        <TextInput
          label="Adresse privée"
          description="Visible seulement après acceptation."
          disabled={!editable}
          {...form.getInputProps('addressPrivate')}
        />
        <Switch
          label="Mission au domicile privé"
          disabled={!editable}
          checked={form.values.atPrivateHome}
          onChange={(e) =>
            form.setFieldValue('atPrivateHome', e.currentTarget.checked)
          }
        />
      </FormSection>

      <FormSection title="Conditions">
        <Textarea
          label="Compétences nécessaires"
          minRows={2}
          autosize
          disabled={!editable}
          {...form.getInputProps('skillsRequired')}
        />
        <Textarea
          label="Conditions matérielles"
          minRows={2}
          autosize
          disabled={!editable}
          {...form.getInputProps('materialConditions')}
        />
        <Switch
          label="Prise en charge du transport"
          disabled={!editable}
          checked={form.values.transportSupport}
          onChange={(e) =>
            form.setFieldValue('transportSupport', e.currentTarget.checked)
          }
        />
        <Switch
          label="Prise en charge du repas"
          disabled={!editable}
          checked={form.values.mealsSupport}
          onChange={(e) =>
            form.setFieldValue('mealsSupport', e.currentTarget.checked)
          }
        />
        <Switch
          label="Prise en charge des équipements"
          disabled={!editable}
          checked={form.values.equipmentSupport}
          onChange={(e) =>
            form.setFieldValue('equipmentSupport', e.currentTarget.checked)
          }
        />
      </FormSection>

      <Text size="xs" c="dimmed">
        La publication consomme un droit gratuit tant que les services sont
        gratuits. L’écran ne dit « publiée » qu’après confirmation du serveur.
      </Text>

      {error ? (
        <AppAlert tone="error" title="Publication">
          {error}
        </AppAlert>
      ) : null}
      {info ? (
        <AppAlert tone="success" title="Enregistré">
          {info}
        </AppAlert>
      ) : null}
    </Stack>

      {editable ? (
        <Box
          style={{
            flexShrink: 0,
            marginTop: 12,
            paddingTop: 12,
            paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
            borderTop: `1px solid ${tokens.color.border.subtle}`,
            background: tokens.color.surface.card,
          }}
        >
          <Group grow>
            <AppButton
              variant="default"
              loading={busy === 'draft'}
              disabled={!!busy}
              onClick={() => void saveDraft()}
            >
              Brouillon
            </AppButton>
            <AppButton
              color="flash"
              loading={busy === 'submit'}
              disabled={!!busy}
              onClick={() => void submitPublish()}
            >
              Publier
            </AppButton>
          </Group>
        </Box>
      ) : (
        <AppAlert tone="info" title="Lecture seule">
          Cette offre ne peut pas être modifiée dans son état actuel (
          {jobStatusLabel(status ?? '')}).
        </AppAlert>
      )}
    </Box>
  );
}
