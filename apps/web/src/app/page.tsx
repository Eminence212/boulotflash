'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Stack, Text, Title, Anchor, Group } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppAlert, AppButton, GlobalLoader } from '@/components/feedback';
import { StatusBadge } from '@/components/boulotflash/StatusBadge';
import { JobCard } from '@/components/boulotflash/JobCard';
import {
  JobSearchFilters,
  type CatalogItem,
  type JobFilterValues,
} from '@/components/jobs/JobSearchFilters';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { useMe } from '@/hooks/useMe';
import { apiFetch, readAccessToken } from '@/lib/api';
import { isEmployerMode, type PublicJob } from '@/lib/me';

type JobsListResponse = {
  items?: PublicJob[];
  page?: number;
  pageSize?: number;
  total?: number;
  message?: string;
};

const EMPTY_FILTERS: JobFilterValues = {
  q: '',
  cityId: null,
  communeId: null,
  categoryId: null,
  currency: null,
  date: null,
  todayOnly: false,
};

function todayYmdKinshasa(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kinshasa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function HomePage() {
  const { me, refresh } = useMe();
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [cities, setCities] = useState<CatalogItem[]>([]);
  const [communes, setCommunes] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [filters, setFilters] = useState<JobFilterValues>(EMPTY_FILTERS);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiFetch<CatalogItem[]>('/catalog/cities?active=1'),
      apiFetch<CatalogItem[]>('/catalog/communes?active=1'),
      apiFetch<CatalogItem[]>('/catalog/categories?active=1'),
    ]).then(([ci, co, ca]) => {
      if (ci.status < 400 && Array.isArray(ci.data)) setCities(ci.data);
      if (co.status < 400 && Array.isArray(co.data)) setCommunes(co.data);
      if (ca.status < 400 && Array.isArray(ca.data)) setCategories(ca.data);
    });
  }, []);

  const loadJobs = useCallback(
    async (
      pageNum = 1,
      append = false,
      override: JobFilterValues = filters,
    ) => {
      setBusy(true);
      setJobsError(null);
      const params = new URLSearchParams();
      if (override.q.trim()) params.set('q', override.q.trim());
      if (override.cityId) params.set('cityId', override.cityId);
      if (override.communeId) params.set('communeId', override.communeId);
      if (override.categoryId) params.set('categoryId', override.categoryId);
      if (override.currency) params.set('currency', override.currency);
      const day = override.todayOnly
        ? todayYmdKinshasa()
        : (override.date ?? '').trim();
      if (day) params.set('date', day);
      params.set('page', String(pageNum));
      params.set('pageSize', '20');

      const { status, data } = await apiFetch<JobsListResponse>(
        `/jobs?${params.toString()}`,
        { accessToken: readAccessToken() },
      );
      setBusy(false);
      if (status >= 400) {
        setJobsError(data.message ?? 'Liste des offres indisponible.');
        if (!append) {
          setJobs([]);
          setTotal(0);
          setBooted(true);
        }
        return;
      }
      const nextItems = data.items ?? [];
      setJobs((prev) => (append ? [...prev, ...nextItems] : nextItems));
      setTotal(data.total ?? 0);
      setPage(data.page ?? pageNum);
      if (!append) setBooted(true);
    },
    [filters],
  );

  useEffect(() => {
    void loadJobs(1, false, EMPTY_FILTERS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- premier chargement

  const gaps = me?.gaps ?? [];
  const employer = isEmployerMode(me);
  const pageSize = 20;
  const hasMore = page * pageSize < total;

  function applyFilters(override?: JobFilterValues) {
    const next = override ?? filters;
    if (override) setFilters(override);
    void loadJobs(1, false, next);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    void loadJobs(1, false, EMPTY_FILTERS);
  }

  if (!booted) {
    return <GlobalLoader fullscreen />;
  }

  return (
    <AppShellLayout
      me={me}
      onLocationChanged={() => {
        void refresh();
        void loadJobs(1, false, filters);
      }}
    >
      <Stack gap="lg">
        <Stack gap={6}>
          <Title
            order={1}
            fz={{ base: 26, sm: 30 }}
            fw={800}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Trouvez un{' '}
            <Text span c="flash" inherit>
              travail
            </Text>{' '}
            aujourd’hui.
          </Title>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            Des missions courtes près de chez vous. Consultez librement ; pour
            postuler ou publier, il faut un profil complet.
          </Text>
          {me ? (
            <Group gap="xs">
              <StatusBadge tone="soft">
                {employer ? 'Recruteur' : 'Candidat'}
              </StatusBadge>
              {employer ? (
                <StatusBadge
                  tone={
                    me.subscription?.status === 'ACTIVE' ? 'succes' : 'refus'
                  }
                >
                  {me.subscription?.label ?? 'Sans abonnement'}
                </StatusBadge>
              ) : (
                <StatusBadge
                  tone={me.workerProfileComplete ? 'succes' : 'attente'}
                >
                  {me.workerProfileComplete ? 'Profil complet' : 'Incomplet'}
                </StatusBadge>
              )}
            </Group>
          ) : null}
        </Stack>

        {me && !employer && gaps.length > 0 ? (
          <AppAlert tone="warning" title="Complétez votre profil pour postuler">
            <Text size="sm">
              Il manque : {gaps.join(', ')}. Vous pouvez déjà parcourir les offres.
            </Text>
            <Group mt="sm" gap="md">
              {me.needsProfileCompletion ? (
                <Anchor
                  component={Link}
                  href="/profil/completer"
                  size="sm"
                  fw={600}
                >
                  Compléter mon profil
                </Anchor>
              ) : null}
              <Anchor
                component={Link}
                href={employer ? '/profil/recruteur' : '/profil/candidat'}
                size="sm"
                fw={600}
              >
                Ouvrir le profil {employer ? 'recruteur' : 'candidat'}
              </Anchor>
            </Group>
          </AppAlert>
        ) : null}

        {me?.status === 'SUSPENDED' ? (
          <AppAlert tone="error" title="Compte suspendu">
            Consultation limitée. La publication est bloquée.
          </AppAlert>
        ) : null}

        {employer && me?.subscription?.status === 'EXPIRED' ? (
          <AppAlert tone="warning" title="Abonnement">
            Votre abonnement n’est pas actif. La publication est refusée.
          </AppAlert>
        ) : null}

        <JobSearchFilters
          values={filters}
          onChange={setFilters}
          cities={cities}
          communes={communes}
          categories={categories}
          resultCount={total}
          loading={busy}
          onApply={applyFilters}
          onReset={resetFilters}
        />

        <Stack gap="sm">
          {jobsError ? (
            <AppAlert tone="error" title="Offres">
              {jobsError}
            </AppAlert>
          ) : null}
          {jobs.length === 0 && !jobsError ? (
            <EmptyState
              icon={IconSearch}
              title="Aucune mission ne correspond"
              description="Élargissez la commune, la catégorie, la date ou les mots-clés."
              action={{ label: 'Effacer les filtres', onClick: resetFilters }}
            />
          ) : null}
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {hasMore ? (
            <AppButton
              variant="default"
              loading={busy}
              onClick={() => void loadJobs(page + 1, true)}
              fullWidth
            >
              Voir plus
            </AppButton>
          ) : null}
        </Stack>
      </Stack>
    </AppShellLayout>
  );
}
