'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Checkbox,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
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

export function PublishJobForm({ initialJobId = null }: PublishJobFormProps) {
  const router = useRouter();
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

  return (
    <Stack gap="md">
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
        disabled={!editable}
        placeholder="Choisir"
        data={categories.map((c) => ({ value: c.id, label: c.name }))}
        value={form.values.categoryId}
        onChange={(v) => form.setFieldValue('categoryId', v)}
      />
      <Textarea
        label="Description"
        required
        minRows={3}
        disabled={!editable}
        {...form.getInputProps('description')}
      />

      <Group grow align="flex-start">
        <TextInput
          label={`Montant (${form.values.currency})`}
          required
          inputMode="decimal"
          disabled={!editable}
          {...form.getInputProps('amountMajor')}
        />
        <Select
          label="Devise"
          disabled={!editable}
          data={[
            { value: 'USD', label: 'USD' },
            { value: 'CDF', label: 'CDF' },
          ]}
          value={form.values.currency}
          onChange={(v) => form.setFieldValue('currency', v ?? 'USD')}
        />
      </Group>
      <Select
        label="Base de rémunération"
        disabled={!editable}
        data={[
          { value: 'MISSION', label: 'Par mission' },
          { value: 'HOUR', label: 'Par heure' },
          { value: 'DAY', label: 'Par journée' },
        ]}
        value={form.values.payUnit}
        onChange={(v) => form.setFieldValue('payUnit', v ?? 'MISSION')}
      />
      <Select
        label="Paiement prévu"
        disabled={!editable}
        data={[
          { value: 'CASH', label: 'Espèces' },
          { value: 'MOBILE_MONEY', label: 'Mobile money' },
        ]}
        value={form.values.payChannel}
        onChange={(v) => form.setFieldValue('payChannel', v ?? 'CASH')}
      />
      <TextInput
        label="Moment du paiement"
        disabled={!editable}
        {...form.getInputProps('payTiming')}
      />

      <NumberInput
        label="Places"
        min={1}
        max={20}
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
        disabled={!editable}
        value={form.values.durationHours}
        onChange={(v) =>
          form.setFieldValue(
            'durationHours',
            typeof v === 'number' ? v : Number(v) || 1,
          )
        }
      />
      <TextInput
        label="Début"
        type="datetime-local"
        required
        disabled={!editable}
        {...form.getInputProps('startAt')}
      />
      <TextInput
        label="Limite de candidature"
        type="datetime-local"
        required
        disabled={!editable}
        {...form.getInputProps('applyDeadline')}
      />
      <TextInput
        label="Clôture des sélections"
        type="datetime-local"
        required
        disabled={!editable}
        {...form.getInputProps('selectionDeadline')}
      />

      <Select
        label="Commune"
        required
        searchable
        disabled={!editable}
        placeholder="Choisir"
        data={communes.map((c) => ({ value: c.id, label: c.name }))}
        value={form.values.communeId}
        onChange={(v) => form.setFieldValue('communeId', v)}
      />
      <TextInput
        label="Repère public"
        disabled={!editable}
        {...form.getInputProps('publicLandmark')}
      />
      <TextInput
        label="Adresse privée (après acceptation)"
        disabled={!editable}
        {...form.getInputProps('addressPrivate')}
      />
      <Checkbox
        label="Mission au domicile privé"
        disabled={!editable}
        checked={form.values.atPrivateHome}
        onChange={(e) =>
          form.setFieldValue('atPrivateHome', e.currentTarget.checked)
        }
      />

      <Textarea
        label="Compétences nécessaires"
        minRows={2}
        disabled={!editable}
        {...form.getInputProps('skillsRequired')}
      />
      <Textarea
        label="Conditions matérielles"
        minRows={2}
        disabled={!editable}
        {...form.getInputProps('materialConditions')}
      />
      <Checkbox
        label="Prise en charge transport"
        disabled={!editable}
        checked={form.values.transportSupport}
        onChange={(e) =>
          form.setFieldValue('transportSupport', e.currentTarget.checked)
        }
      />
      <Checkbox
        label="Prise en charge repas"
        disabled={!editable}
        checked={form.values.mealsSupport}
        onChange={(e) =>
          form.setFieldValue('mealsSupport', e.currentTarget.checked)
        }
      />
      <Checkbox
        label="Prise en charge équipements"
        disabled={!editable}
        checked={form.values.equipmentSupport}
        onChange={(e) =>
          form.setFieldValue('equipmentSupport', e.currentTarget.checked)
        }
      />

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

      {editable ? (
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
      ) : (
        <AppAlert tone="info" title="Lecture seule">
          Cette offre ne peut pas être modifiée dans son état actuel (
          {jobStatusLabel(status ?? '')}).
        </AppAlert>
      )}
    </Stack>
  );
}
