import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Prisma, type JobStatus } from '@prisma/client';
import { labelFr } from '@boulotflash/contracts';
import { formatDistanceKm, haversineKm } from '../geo/user-location';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../identity/profile.service';
import { SessionService } from '../identity/session.service';
import { PublicJobsCacheService } from '../redis-cache/public-jobs-cache.service';
import {
  ALREADY_APPLIED_MESSAGE,
  DAILY_LIMIT_MESSAGE,
  UNAVAILABLE_MESSAGE,
  alreadyAppliedBlock,
  applicationRequestHash,
  canWithdraw,
  dailyLimitReached,
  idempotencyDecision,
  isOwnJob,
  offerAcceptsApplications,
} from './application-rules';
import { NominatimGeocoder } from './nominatim-geocoder';
import { ClockService } from '../selection/clock.service';
import { MatchQueueService } from '../notifications/match-queue.service';
import { insertInAppNotifications, jobFacts, jobPlace } from '@boulotflash/database';
import {
  JobValidationError,
  SUBSTANTIAL_KEYS,
  assertJobReadyToSubmit,
  contentFingerprint,
  jobSnapshot,
  parseDate,
  type JobDraftInput,
} from './job-fields';
import {
  closedMessageFor,
  isPubliclyVisibleStatus,
  toPublicJobDto,
  toPublicPublisher,
  type PublicJobDetailDto,
  type PublicJobDto,
} from './public-job.dto';

export type PublicJobsQuery = {
  q?: string;
  cityId?: string;
  communeId?: string;
  categoryId?: string;
  currency?: string;
  date?: string;
  page?: number;
  pageSize?: number;
};

function validationHttp(err: unknown): never {
  if (err instanceof JobValidationError) {
    throw new HttpException(
      { code: err.code, message: err.message },
      400,
    );
  }
  throw err;
}

const ACTIVE_PARTICIPATION_STATUSES: Array<
  'CONFIRMED' | 'COMPLETED' | 'NO_SHOW'
> = ['CONFIRMED', 'COMPLETED', 'NO_SHOW'];

const HOURS_12_MS = 12 * 60 * 60 * 1000;
const HOUR_1_MS = 60 * 60 * 1000;
const DAY_2_MS = 2 * 24 * 60 * 60 * 1000;

const JOB_DETAILS_SELECT = {
  id: true,
  employerId: true,
  title: true,
  description: true,
  categoryId: true,
  communeId: true,
  publicLandmark: true,
  publicLatitude: true,
  publicLongitude: true,
  addressPrivate: true,
  privateLatitude: true,
  privateLongitude: true,
  missionPhone: true,
  atPrivateHome: true,
  startAt: true,
  durationHours: true,
  workersNeeded: true,
  amount: true,
  currency: true,
  payUnit: true,
  payChannel: true,
  payTiming: true,
  skillsRequired: true,
  materialConditions: true,
  transportSupport: true,
  mealsSupport: true,
  equipmentSupport: true,
  applyDeadline: true,
  selectionDeadline: true,
  status: true,
  rejectionReason: true,
  isFeatured: true,
  featuredUntil: true,
  currentVersionId: true,
  publishedAt: true,
  detailViewCount: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  employer: {
    select: {
      id: true,
      status: true,
      displayName: true,
      avatarUrl: true,
      employerProfile: { select: { displayName: true } },
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      isActive: true,
      isSensitive: true,
      sensitiveIfHome: true,
    },
  },
  commune: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
  _count: {
    select: {
      applications: true,
      participations: {
        where: { status: { not: 'CANCELLED' } },
      },
    },
  },
} as const satisfies Prisma.JobSelect;

type JobDetailsRow = Prisma.JobGetPayload<{ select: typeof JOB_DETAILS_SELECT }>;

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly profiles: ProfileService,
    private readonly publicJobsCache: PublicJobsCacheService,
    private readonly geocoder: NominatimGeocoder,
    private readonly clock: ClockService,
    private readonly matchQueue: MatchQueueService,
  ) {}

  async listPublicJobs(
    query: PublicJobsQuery = {},
    viewerId?: string | null,
  ): Promise<{
    items: PublicJobDto[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const page = Math.max(1, Number.isFinite(query.page) ? Number(query.page) : 1);
    const pageSize = Math.min(
      50,
      Math.max(1, Number.isFinite(query.pageSize) ? Number(query.pageSize) : 20),
    );
    const normalized = {
      q: query.q?.trim() || undefined,
      cityId: query.cityId?.trim() || undefined,
      communeId: query.communeId?.trim() || undefined,
      categoryId: query.categoryId?.trim() || undefined,
      currency: query.currency?.trim()?.toUpperCase() || undefined,
      date: query.date?.trim() || undefined,
      page,
      pageSize,
    };

    if (
      normalized.currency &&
      normalized.currency !== 'USD' &&
      normalized.currency !== 'CDF'
    ) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Devise CDF ou USD uniquement.' },
        400,
      );
    }

    const origin = await this.viewerOrigin(viewerId);
    const cacheHash = this.publicJobsCache.cacheKey(normalized);
    if (!origin) {
      const cached = await this.publicJobsCache.get<{
        items: PublicJobDto[];
        page: number;
        pageSize: number;
        total: number;
      }>(cacheHash);
      if (cached) return cached;
    }

    const now = new Date();
    const where: Prisma.JobWhereInput = {
      status: 'PUBLISHED',
      ...(normalized.communeId ? { communeId: normalized.communeId } : {}),
      ...(normalized.categoryId ? { categoryId: normalized.categoryId } : {}),
      ...(normalized.currency
        ? { currency: normalized.currency as 'USD' | 'CDF' }
        : {}),
      ...(normalized.cityId
        ? { commune: { cityId: normalized.cityId, isActive: true } }
        : {}),
      ...(normalized.q
        ? {
            OR: [
              { title: { contains: normalized.q, mode: 'insensitive' } },
              { description: { contains: normalized.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(normalized.date
        ? (() => {
            const day = this.kinshasaDayBounds(normalized.date!);
            return day
              ? { startAt: { gte: day.start, lt: day.end } }
              : { id: '00000000-0000-4000-8000-000000000000' };
          })()
        : {}),
    };

    const candidates = await this.prisma.client.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        currency: true,
        payUnit: true,
        startAt: true,
        durationHours: true,
        publicLandmark: true,
        publicLatitude: true,
        publicLongitude: true,
        workersNeeded: true,
        featuredUntil: true,
        applyDeadline: true,
        publishedAt: true,
        detailViewCount: true,
        status: true,
        category: { select: { name: true } },
        commune: { select: { name: true } },
        employer: {
          select: {
            id: true,
            status: true,
            displayName: true,
            avatarUrl: true,
            employerProfile: { select: { displayName: true } },
          },
        },
      },
    });

    const enriched: Array<
      PublicJobDto & {
        distanceLabel?: string;
        _sortFeatured: number;
        _sortPublished: number;
        _sortDistance: number;
      }
    > = [];

    for (const job of candidates) {
      let status: JobStatus = job.status;
      if (job.applyDeadline <= now) {
        const lifecycle = await this.ensureJobLifecycleStatus(job.id);
        status = lifecycle.status as JobStatus;
      }
      if (status !== 'PUBLISHED') continue;

      const occupied = await this.countOccupiedPlaces(job.id);
      const placesRemaining = Math.max(0, job.workersNeeded - occupied);
      const featured = !!(job.featuredUntil && job.featuredUntil > now);
      const applicationsOpen =
        placesRemaining > 0 && job.applyDeadline > now;

      const dto = toPublicJobDto({
        id: job.id,
        title: job.title,
        category: job.category.name,
        amount: job.amount,
        currency: job.currency,
        payUnit: job.payUnit,
        startAt: job.startAt,
        durationHours: job.durationHours,
        commune: job.commune.name,
        publicLandmark: job.publicLandmark,
        publicLatitude: job.publicLatitude,
        publicLongitude: job.publicLongitude,
        placesRemaining,
        featured,
        applicationsOpen,
        publishedAt: job.publishedAt,
        detailViewCount: job.detailViewCount,
        publisher: toPublicPublisher({
          userId: job.employer.id,
          userDisplayName: job.employer.displayName,
          avatarUrl: job.employer.avatarUrl,
          employerDisplayName: job.employer.employerProfile?.displayName ?? null,
          accountStatus: job.employer.status,
        }),
      });

      const distanceKm =
        origin &&
        job.publicLatitude != null &&
        job.publicLongitude != null
          ? haversineKm(
              origin.latitude,
              origin.longitude,
              job.publicLatitude,
              job.publicLongitude,
            )
          : null;

      enriched.push({
        ...dto,
        distanceLabel:
          distanceKm == null ? undefined : formatDistanceKm(distanceKm),
        _sortFeatured: featured ? 0 : 1,
        _sortPublished: job.publishedAt?.getTime() ?? 0,
        _sortDistance: distanceKm ?? Number.POSITIVE_INFINITY,
      });
    }

    enriched.sort((a, b) => {
      if (a._sortFeatured !== b._sortFeatured) {
        return a._sortFeatured - b._sortFeatured;
      }
      if (origin && a._sortDistance !== b._sortDistance) {
        return a._sortDistance - b._sortDistance;
      }
      return b._sortPublished - a._sortPublished;
    });

    const total = enriched.length;
    const start = (page - 1) * pageSize;
    const items = enriched
      .slice(start, start + pageSize)
      .map(
        ({
          _sortFeatured: _f,
          _sortPublished: _p,
          _sortDistance: _d,
          ...item
        }) => item,
      );

    const payload = { items, page, pageSize, total };
    if (!origin) await this.publicJobsCache.set(cacheHash, payload);
    return payload;
  }

  /** Position acceptée du visiteur. Absente : tri par date, comme la liste publique. */
  private async viewerOrigin(
    viewerId?: string | null,
  ): Promise<{ latitude: number; longitude: number } | null> {
    if (!viewerId) return null;
    const user = await this.prisma.client.user.findUnique({
      where: { id: viewerId },
      select: {
        locationConsentAt: true,
        locationLatitude: true,
        locationLongitude: true,
      },
    });
    if (
      !user?.locationConsentAt ||
      user.locationLatitude == null ||
      user.locationLongitude == null
    ) {
      return null;
    }
    return {
      latitude: user.locationLatitude,
      longitude: user.locationLongitude,
    };
  }

  async createJobGate(userId: string) {
    const gate = await this.assertEmployerCanPublish(userId);
    return {
      ok: true as const,
      status: 'DRAFT' as const,
      message:
        'Abonnement actif. Le formulaire de création d’offre arrive à l’étape 12.',
      subscription: {
        status: gate.subscription.status,
        endsAt: gate.subscription.endsAt,
        label: gate.subscriptionLabel,
      },
    };
  }

  async createDraft(userId: string, body: JobDraftInput) {
    await this.assertEmployerCanPublish(userId);

    if (!body.categoryId?.trim()) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Catégorie requise.' },
        400,
      );
    }
    if (!body.communeId?.trim()) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Commune requise.' },
        400,
      );
    }

    let startAt: Date;
    let applyDeadline: Date;
    let selectionDeadline: Date;
    try {
      startAt = body.startAt
        ? parseDate(body.startAt, 'Date de début')
        : new Date(Date.now() + DAY_2_MS);
      applyDeadline = body.applyDeadline
        ? parseDate(body.applyDeadline, 'Date limite de candidature')
        : new Date(startAt.getTime() - HOURS_12_MS);
      selectionDeadline = body.selectionDeadline
        ? parseDate(body.selectionDeadline, 'Date limite de sélection')
        : new Date(startAt.getTime() - HOUR_1_MS);
    } catch (err) {
      validationHttp(err);
    }

    const job = await this.prisma.client.job.create({
      data: {
        employerId: userId,
        title: body.title?.trim() || '(brouillon)',
        description: body.description?.trim() || '',
        categoryId: body.categoryId.trim(),
        communeId: body.communeId.trim(),
        publicLandmark: this.trimNullable(body.publicLandmark),
        publicLatitude: body.publicLatitude ?? null,
        publicLongitude: body.publicLongitude ?? null,
        addressPrivate: this.trimNullable(body.addressPrivate),
        privateLatitude: body.privateLatitude ?? null,
        privateLongitude: body.privateLongitude ?? null,
        missionPhone: this.trimNullable(body.missionPhone),
        atPrivateHome: body.atPrivateHome ?? false,
        startAt,
        durationHours: body.durationHours ?? 4,
        workersNeeded: body.workersNeeded ?? 1,
        amount: body.amount ?? 0,
        currency: body.currency ?? 'USD',
        payUnit: body.payUnit ?? 'MISSION',
        payChannel: body.payChannel ?? 'CASH',
        payTiming: this.trimNullable(body.payTiming),
        skillsRequired: this.trimNullable(body.skillsRequired),
        materialConditions: this.trimNullable(body.materialConditions),
        transportSupport: body.transportSupport ?? false,
        mealsSupport: body.mealsSupport ?? false,
        equipmentSupport: body.equipmentSupport ?? false,
        applyDeadline,
        selectionDeadline,
        status: 'DRAFT',
      },
      select: JOB_DETAILS_SELECT,
    });

    return this.toOwnerJobView(job);
  }

  async updateDraft(userId: string, jobId: string, body: JobDraftInput) {
    const job = await this.loadOwnedJob(jobId, userId);
    const patch = this.buildDraftPatch(body);
    const nextSnapshot = this.mergeJobSnapshot(job, patch);

    if (job.status === 'DRAFT' || job.status === 'REJECTED') {
      const updated = await this.prisma.client.job.update({
        where: { id: jobId },
        data: {
          ...patch,
          ...(job.status === 'REJECTED' ? { rejectionReason: null } : {}),
        } as Prisma.JobUncheckedUpdateInput,
        select: JOB_DETAILS_SELECT,
      });
      return this.toOwnerJobView(updated);
    }

    if (job.status === 'PUBLISHED' || job.status === 'FILLED') {
      const substantial = this.hasSubstantialChange(job, nextSnapshot);
      if (substantial) {
        const updated = await this.prisma.client.$transaction(async (tx) => {
          const lastVersion = await tx.jobVersion.findFirst({
            where: { jobId },
            orderBy: { versionNumber: 'desc' },
            select: { versionNumber: true },
          });

          const version = await tx.jobVersion.create({
            data: {
              jobId,
              versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
              snapshot: jobSnapshot(nextSnapshot) as Prisma.InputJsonValue,
              createdBy: userId,
            },
            select: { id: true },
          });

          await tx.selectionOffer.updateMany({
            where: {
              status: 'PENDING',
              application: { jobId },
            },
            data: { status: 'CANCELLED' },
          });

          await tx.job.update({
            where: { id: jobId },
            data: {
              ...patch,
              status: 'IN_REVIEW',
              rejectionReason: null,
              currentVersionId: version.id,
            } as Prisma.JobUncheckedUpdateInput,
          });

          await this.notifyImportantChange(tx, jobId, version.id);

          return tx.job.findUnique({
            where: { id: jobId },
            select: JOB_DETAILS_SELECT,
          });
        });

        if (!updated) {
          throw new HttpException(
            { code: 'NOT_FOUND', message: 'Offre introuvable.' },
            404,
          );
        }

        await this.publicJobsCache.invalidate();
        return this.toOwnerJobView(updated);
      }

      const updated = await this.prisma.client.job.update({
        where: { id: jobId },
        data: patch,
        select: JOB_DETAILS_SELECT,
      });
      return this.toOwnerJobView(updated);
    }

    throw new HttpException(
      {
        code: 'JOB_NOT_EDITABLE',
        message: 'Cette offre ne peut pas être modifiée dans son état actuel.',
      },
      409,
    );
  }

  async submit(userId: string, jobId: string) {
    await this.assertEmployerCanPublish(userId);

    const job = await this.loadOwnedJob(jobId, userId);
    if (job.status !== 'DRAFT' && job.status !== 'REJECTED') {
      throw new HttpException(
        {
          code: 'JOB_NOT_SUBMITTABLE',
          message: 'Cette offre ne peut pas être soumise dans son état actuel.',
        },
        409,
      );
    }

    try {
      assertJobReadyToSubmit({
        title: job.title,
        description: job.description,
        categoryId: job.categoryId,
        communeId: job.communeId,
        startAt: job.startAt,
        durationHours: job.durationHours,
        workersNeeded: job.workersNeeded,
        amount: job.amount,
        currency: job.currency,
        payUnit: job.payUnit,
        payChannel: job.payChannel,
        applyDeadline: job.applyDeadline,
        selectionDeadline: job.selectionDeadline,
      });
    } catch (err) {
      validationHttp(err);
    }

    if (!job.category.isActive) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Catégorie inactive.' },
        400,
      );
    }
    if (!job.commune.isActive) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Commune inactive.' },
        400,
      );
    }

    const haystack = `${job.title}\n${job.description}`.toLowerCase();
    const forbiddenTerms = await this.prisma.client.forbiddenTerm.findMany({
      select: { term: true },
    });
    const matchedTerm = forbiddenTerms.find((row) =>
      haystack.includes(row.term.toLowerCase()),
    );
    if (matchedTerm) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: `Le contenu contient un terme interdit : "${matchedTerm.term}".`,
        },
        400,
      );
    }

    const oneHourAgo = new Date(Date.now() - HOUR_1_MS);
    const duplicates = await this.prisma.client.job.findMany({
      where: {
        employerId: userId,
        id: { not: jobId },
        createdAt: { gte: oneHourAgo },
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });
    const fingerprint = contentFingerprint(job.title, job.description);
    if (
      duplicates.some(
        (candidate) =>
          contentFingerprint(candidate.title, candidate.description) ===
          fingerprint,
      )
    ) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message:
            'Une offre au contenu identique a déjà été créée dans la dernière heure.',
        },
        409,
      );
    }

    const needsReview =
      !(await this.hasEverPublished(userId)) ||
      job.category.isSensitive ||
      (job.category.sensitiveIfHome && job.atPrivateHome);
    const now = new Date();

    const result = await this.prisma.client.$transaction(async (tx) => {
      const latestVersion = await tx.jobVersion.findFirst({
        where: { jobId },
        orderBy: { versionNumber: 'desc' },
        select: { id: true },
      });

      let currentVersionId = latestVersion?.id ?? job.currentVersionId ?? null;
      if (!latestVersion) {
        const version = await tx.jobVersion.create({
          data: {
            jobId,
            versionNumber: 1,
            snapshot: jobSnapshot(job) as Prisma.InputJsonValue,
            createdBy: userId,
          },
          select: { id: true },
        });
        currentVersionId = version.id;
      } else {
        await tx.jobVersion.update({
          where: { id: latestVersion.id },
          data: {
            snapshot: jobSnapshot(job) as Prisma.InputJsonValue,
          },
        });
      }

      await tx.publicationRight.create({
        data: {
          employerId: userId,
          source: 'FREE',
          type: 'POST',
          status: 'USED',
          jobId,
          usedAt: now,
        },
      });

      return tx.job.update({
        where: { id: jobId },
        data: {
          status: needsReview ? 'IN_REVIEW' : 'PUBLISHED',
          rejectionReason: null,
          currentVersionId,
          publishedAt: needsReview ? null : job.publishedAt ?? now,
          expiresAt: null,
        },
        select: {
          id: true,
          status: true,
          publishedAt: true,
        },
      });
    });

    try {
      await this.geocoder.enqueue(result.id);
    } catch {
      this.logger.warn('Géocodage non appliqué, publication conservée.');
    }

    if (result.status === 'PUBLISHED') {
      await this.publicJobsCache.invalidate();
      // Alerte de correspondance : premier passage en PUBLISHED seulement (CDC §8.3).
      if (!job.publishedAt) await this.matchQueue.enqueueFirstPublication(result.id);
    }

    return {
      id: result.id,
      status: result.status,
      publishedAt: this.toIso(result.publishedAt),
    };
  }

  /**
   * « Modification importante » (CDC §8.2) : in-app aux candidats concernés, dans la transaction de la
   * nouvelle version. Jamais de seconde alerte « correspond au profil ».
   */
  private async notifyImportantChange(tx: Prisma.TransactionClient, jobId: string, versionId: string) {
    const job = await tx.job.findUniqueOrThrow({
      where: { id: jobId },
      select: {
        title: true,
        startAt: true,
        amount: true,
        currency: true,
        payUnit: true,
        commune: { select: { name: true } },
        applications: {
          where: { status: { in: ['SUBMITTED', 'SHORTLISTED', 'OFFERED', 'ACCEPTED'] } },
          select: { workerId: true, status: true, participation: { select: { status: true } } },
        },
      },
    });
    const facts = jobFacts({
      title: job.title,
      startAt: job.startAt,
      commune: job.commune.name,
      amount: job.amount,
      currency: job.currency,
      payUnit: job.payUnit,
    });
    const rows = job.applications
      .filter((a) => a.participation?.status !== 'CANCELLED')
      .map((a) => ({
        userId: a.workerId,
        templateKey: 'job_changed',
        title: 'Offre modifiée',
        message:
          a.status === 'ACCEPTED'
            ? `L’offre devient ${facts}, et repasse en validation. Vos conditions déjà acceptées restent valables ; ouvrez l’offre pour relire la nouvelle version.`
            : a.status === 'OFFERED'
              ? `L’offre devient ${facts}, et repasse en validation. La proposition en cours est annulée ; ouvrez l’offre pour relire la nouvelle version.`
              : `L’offre devient ${facts}, et repasse en validation. Ouvrez-la pour relire la nouvelle version avant de continuer.`,
        relatedType: 'job',
        relatedId: jobId,
        dedupeKey: `job_changed:${versionId}`,
      }));
    await insertInAppNotifications(tx, rows, new Date());
  }

  async republish(userId: string, jobId: string) {
    const job = await this.loadOwnedJob(jobId, userId);
    const copied = await this.prisma.client.job.create({
      data: {
        employerId: userId,
        title: job.title,
        description: job.description,
        categoryId: job.categoryId,
        communeId: job.communeId,
        publicLandmark: job.publicLandmark,
        publicLatitude: job.publicLatitude,
        publicLongitude: job.publicLongitude,
        addressPrivate: job.addressPrivate,
        privateLatitude: job.privateLatitude,
        privateLongitude: job.privateLongitude,
        missionPhone: job.missionPhone,
        atPrivateHome: job.atPrivateHome,
        startAt: job.startAt,
        durationHours: job.durationHours,
        workersNeeded: job.workersNeeded,
        amount: job.amount,
        currency: job.currency,
        payUnit: job.payUnit,
        payChannel: job.payChannel,
        payTiming: job.payTiming,
        skillsRequired: job.skillsRequired,
        materialConditions: job.materialConditions,
        transportSupport: job.transportSupport,
        mealsSupport: job.mealsSupport,
        equipmentSupport: job.equipmentSupport,
        applyDeadline: job.applyDeadline,
        selectionDeadline: job.selectionDeadline,
        status: 'DRAFT',
        rejectionReason: null,
        isFeatured: false,
        featuredUntil: null,
        currentVersionId: null,
        publishedAt: null,
        expiresAt: null,
      },
      select: JOB_DETAILS_SELECT,
    });

    return this.toOwnerJobView(copied);
  }

  async listMine(userId: string) {
    const [settings, subscription, jobs] = await Promise.all([
      this.getPlatformSettings(),
      this.prisma.client.subscription.findUnique({
        where: { employerId: userId },
        select: { status: true, endsAt: true },
      }),
      this.prisma.client.job.findMany({
        where: { employerId: userId },
        orderBy: [{ updatedAt: 'desc' }],
        select: {
          id: true,
          title: true,
          status: true,
          rejectionReason: true,
          publishedAt: true,
          updatedAt: true,
          workersNeeded: true,
          commune: { select: { name: true } },
          _count: {
            select: {
              applications: true,
              participations: {
                where: { status: { in: ACTIVE_PARTICIPATION_STATUSES } },
              },
            },
          },
        },
      }),
    ]);

    return {
      subscription: {
        status: subscription?.status ?? null,
        endsAt: subscription?.endsAt ?? null,
        label: this.subscriptionLabel(settings.servicesPayants),
      },
      items: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        status: job.status,
        rejectionReason: job.rejectionReason,
        publishedAt: this.toIso(job.publishedAt),
        updatedAt: job.updatedAt.toISOString(),
        workersNeeded: job.workersNeeded,
        commune: job.commune.name,
        applicationsCount: job._count.applications,
        confirmedParticipationsCount: job._count.participations,
      })),
    };
  }

  async getJob(userId: string | null, jobId: string, countDetailView = false) {
    await this.ensureJobLifecycleStatus(jobId);

    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: JOB_DETAILS_SELECT,
    });
    if (!job) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Offre introuvable.' },
        404,
      );
    }

    const isOwner = !!userId && job.employerId === userId;
    if (!isOwner && !isPubliclyVisibleStatus(job.status)) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Offre introuvable.' },
        404,
      );
    }

    if (isOwner) {
      return { body: this.toOwnerJobView(job), countedView: false };
    }

    let detailViewCount = job.detailViewCount;
    let countedView = false;
    if (countDetailView) {
      const updated = await this.prisma.client.job.update({
        where: { id: job.id },
        data: { detailViewCount: { increment: 1 } },
        select: { detailViewCount: true },
      });
      detailViewCount = updated.detailViewCount;
      countedView = true;
    }

    return {
      body: await this.toPublicJobDetail(job, detailViewCount),
      countedView,
    };
  }

  async ensureJobLifecycleStatus(jobId: string): Promise<{
    id: string;
    status: string;
    activeParticipations: number;
  }> {
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        applyDeadline: true,
        workersNeeded: true,
        expiresAt: true,
      },
    });
    if (!job) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Offre introuvable.' },
        404,
      );
    }

    const activeParticipations = await this.countOccupiedPlaces(jobId);

    const now = new Date();
    if (job.applyDeadline > now) {
      return {
        id: job.id,
        status: job.status,
        activeParticipations,
      };
    }

    if (!['PUBLISHED', 'FILLED', 'EXPIRED'].includes(job.status)) {
      return {
        id: job.id,
        status: job.status,
        activeParticipations,
      };
    }

    let nextStatus = job.status;
    if (activeParticipations === 0) {
      nextStatus = 'EXPIRED';
    } else if (activeParticipations >= job.workersNeeded) {
      nextStatus = 'FILLED';
    } else {
      nextStatus = 'PUBLISHED';
    }

    if (nextStatus !== job.status) {
      await this.prisma.client.job.update({
        where: { id: jobId },
        data: {
          status: nextStatus,
          expiresAt: nextStatus === 'EXPIRED' ? job.expiresAt ?? now : null,
        },
      });
      await this.publicJobsCache.invalidate();
    }

    return {
      id: job.id,
      status: nextStatus,
      activeParticipations,
    };
  }

  async apply(
    userId: string,
    jobId: string,
    body: { availabilityConfirmed?: unknown; message?: unknown },
    idempotencyKey: string | undefined,
  ): Promise<{ httpStatus: number; body: Record<string, unknown> }> {
    await this.sessions.assertHasPhone(userId);

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!user || user.status === 'SUSPENDED' || user.status === 'CLOSED') {
      throw new HttpException(
        {
          code: 'FORBIDDEN',
          message: 'Compte suspendu ou fermé — candidature impossible.',
        },
        403,
      );
    }

    const worker = await this.profiles.getWorkerProfileView(userId);
    const completeness = this.profiles.workerCompleteness(
      worker
        ? {
            displayName: worker.displayName,
            communeId: worker.communeId,
            mainCategoryId: worker.mainCategoryId,
            availability: worker.availability,
          }
        : null,
    );
    if (!completeness.complete) {
      throw new HttpException(
        {
          code: 'PROFILE_INCOMPLETE',
          message: `Complétez votre profil candidat : ${completeness.gaps.join(', ')}.`,
          gaps: completeness.gaps,
        },
        403,
      );
    }

    const baseJob = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: { id: true, employerId: true },
    });
    if (!baseJob) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Offre introuvable.' },
        404,
      );
    }
    if (isOwnJob(baseJob.employerId, userId)) {
      throw new HttpException(
        {
          code: 'OWN_JOB',
          message: 'Vous ne pouvez pas candidater sur votre offre.',
        },
        409,
      );
    }

    await this.ensureJobLifecycleStatus(jobId);

    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        applyDeadline: true,
        workersNeeded: true,
        amount: true,
        currency: true,
        payUnit: true,
        title: true,
        startAt: true,
        employerId: true,
        commune: { select: { name: true } },
      },
    });
    if (!job) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Offre introuvable.' },
        404,
      );
    }

    const now = new Date();
    const occupied = await this.countOccupiedPlaces(jobId);
    const placesRemaining = Math.max(0, job.workersNeeded - occupied);
    if (
      !offerAcceptsApplications({
        status: job.status,
        applyDeadline: job.applyDeadline,
        placesRemaining,
        now,
      })
    ) {
      throw new HttpException(
        {
          code: 'OFFER_NOT_OPEN',
          message: 'Les candidatures sont closes pour cette offre.',
        },
        409,
      );
    }
    if (user.status !== 'ACTIVE') {
      throw new HttpException(
        {
          code: 'PROFILE_INCOMPLETE',
          message: 'Complétez votre profil candidat avant de postuler.',
          gaps: completeness.gaps,
        },
        403,
      );
    }
    if (!worker?.isAvailable) {
      throw new HttpException(
        { code: 'NOT_AVAILABLE', message: UNAVAILABLE_MESSAGE },
        409,
      );
    }
    if (!worker.termsAcceptedAt) {
      throw new HttpException(
        {
          code: 'TERMS_REQUIRED',
          message: 'Acceptez les règles avant de postuler.',
        },
        403,
      );
    }
    if (!worker.communeId || !worker.mainCategoryId) {
      throw new HttpException(
        {
          code: 'PROFILE_INCOMPLETE',
          message: 'Indiquez une compétence et une commune avant de postuler.',
        },
        403,
      );
    }

    if (body.availabilityConfirmed !== true) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: 'Confirmez votre disponibilité pour postuler.',
        },
        400,
      );
    }
    const note =
      typeof body.message === 'string' ? body.message.trim() : '';
    if (note.length > 500) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Le message dépasse 500 caractères.' },
        400,
      );
    }
    const key = idempotencyKey?.trim() ?? '';
    if (!key || key.length > 200) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Indiquez une clé d’idempotence.' },
        400,
      );
    }
    const hash = applicationRequestHash({
      availabilityConfirmed: true,
      message: note,
    });
    const storedKey = await this.prisma.client.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
    const decision = idempotencyDecision(storedKey?.requestHash ?? null, hash);
    if (decision === 'conflict') {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message:
            'Cette clé d’idempotence a déjà servi pour une autre demande.',
        },
        409,
      );
    }
    if (decision === 'replay' && storedKey?.responseBody) {
      return {
        httpStatus: storedKey.responseCode,
        body: storedKey.responseBody as Record<string, unknown>,
      };
    }

    const existing = await this.prisma.client.application.findUnique({
      where: { jobId_workerId: { jobId, workerId: userId } },
      select: { status: true },
    });
    const blocked = alreadyAppliedBlock(existing?.status ?? null);
    if (blocked) {
      throw new HttpException(blocked, 409);
    }

    const settings = await this.prisma.client.platformSetting.findUnique({
      where: { id: 1 },
      select: { applicationsPerRollingDay: true },
    });
    const limit = settings?.applicationsPerRollingDay ?? 5;
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      const created = await this.prisma.client.$transaction(async (tx) => {
        // Sérialise les candidatures d’une même personne : sans ce verrou,
        // des POST parallèles sur des offres différentes passeraient tous
        // le comptage avant la première insertion.
        const lockKey = `applications:${userId}`;
        await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${lockKey}))) AS l`;
        const recentCount = await tx.application.count({
          where: { workerId: userId, appliedAt: { gte: since } },
        });
        if (dailyLimitReached(recentCount, limit)) {
          throw new HttpException(
            { code: 'RATE_LIMIT', message: DAILY_LIMIT_MESSAGE },
            409,
          );
        }
        const row = await tx.application.create({
          data: {
            jobId,
            workerId: userId,
            status: 'SUBMITTED',
            message: note || null,
            amount: job.amount,
            currency: job.currency,
            payUnit: job.payUnit,
            communeName: job.commune.name,
          },
          select: { id: true, status: true },
        });
        await insertInAppNotifications(
          tx,
          [
            {
              userId: job.employerId,
              templateKey: 'application_submitted',
              title: 'Nouvelle candidature',
              message: `${worker.displayName} a postulé à ${jobPlace({ title: job.title, startAt: job.startAt, commune: job.commune.name })}. Ouvrez les candidatures pour présélectionner, proposer une place ou refuser.`,
              relatedType: 'application',
              relatedId: row.id,
              dedupeKey: `application_submitted:${row.id}`,
            },
          ],
          now,
        );
        const responseBody = {
          id: row.id,
          status: row.status,
          message: 'Candidature envoyée',
        };
        await tx.idempotencyKey.create({
          data: {
            userId,
            key,
            requestHash: hash,
            responseCode: 201,
            responseBody,
          },
        });
        return responseBody;
      });
      return { httpStatus: 201, body: created };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const replay = await this.prisma.client.idempotencyKey.findUnique({
          where: { userId_key: { userId, key } },
        });
        if (
          replay &&
          idempotencyDecision(replay.requestHash, hash) === 'replay' &&
          replay.responseBody
        ) {
          return {
            httpStatus: replay.responseCode,
            body: replay.responseBody as Record<string, unknown>,
          };
        }
        throw new HttpException(
          { code: 'ALREADY_APPLIED', message: ALREADY_APPLIED_MESSAGE },
          409,
        );
      }
      throw err;
    }
  }

  async myApplication(userId: string, jobId: string) {
    const row = await this.prisma.client.application.findUnique({
      where: { jobId_workerId: { jobId, workerId: userId } },
      select: {
        id: true,
        status: true,
        appliedAt: true,
        selectionOffers: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, expiresAt: true },
        },
        participation: { select: { id: true, status: true } },
      },
    });
    if (!row) return { application: null };
    const now = await this.clock.now();
    return {
      application: {
        id: row.id,
        status: row.status,
        statusLabel: labelFr(row.status),
        appliedAt: row.appliedAt.toISOString(),
        offer: this.offerView(row.selectionOffers[0], now),
        participation: row.participation
          ? { id: row.participation.id, status: row.participation.status }
          : null,
      },
    };
  }

  async listMyApplications(userId: string) {
    const rows = await this.prisma.client.application.findMany({
      where: { workerId: userId },
      orderBy: { appliedAt: 'desc' },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        payUnit: true,
        communeName: true,
        appliedAt: true,
        selectionOffers: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, expiresAt: true },
        },
        participation: { select: { id: true, status: true } },
        job: {
          select: {
            id: true,
            title: true,
            amount: true,
            currency: true,
            payUnit: true,
            commune: { select: { name: true } },
          },
        },
      },
    });
    const now = await this.clock.now();
    return {
      items: rows.map((row) => ({
        id: row.id,
        jobId: row.job.id,
        title: row.job.title,
        status: row.status,
        statusLabel: labelFr(row.status),
        appliedAt: row.appliedAt.toISOString(),
        commune: row.communeName ?? row.job.commune.name,
        amount: row.amount ?? row.job.amount,
        currency: row.currency ?? row.job.currency,
        payUnit: row.payUnit ?? row.job.payUnit,
        offerExpiresAt:
          row.selectionOffers[0]?.status === 'PENDING'
            ? row.selectionOffers[0].expiresAt.toISOString()
            : null,
        offer: this.offerView(row.selectionOffers[0], now),
        participation: row.participation
          ? { id: row.participation.id, status: row.participation.status }
          : null,
      })),
    };
  }

  async withdraw(userId: string, applicationId: string) {
    const row = await this.prisma.client.application.findUnique({
      where: { id: applicationId },
      select: { id: true, workerId: true, status: true },
    });
    if (!row || row.workerId !== userId) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Candidature introuvable.' },
        404,
      );
    }
    if (!canWithdraw(row.status)) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: 'Cette candidature ne peut plus être retirée.',
        },
        409,
      );
    }
    // Mise à jour conditionnelle : une sélection concurrente ne doit pas être écrasée.
    const updated = await this.prisma.client.application.updateMany({
      where: { id: applicationId, status: { in: ['SUBMITTED', 'SHORTLISTED'] } },
      data: { status: 'WITHDRAWN' },
    });
    if (updated.count === 0) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: 'Cette candidature ne peut plus être retirée.',
        },
        409,
      );
    }
    return {
      id: applicationId,
      status: 'WITHDRAWN',
      statusLabel: labelFr('WITHDRAWN'),
      message: 'Candidature retirée',
    };
  }

  async reviewQueue() {
    const jobs = await this.prisma.client.job.findMany({
      where: { status: 'IN_REVIEW' },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        payUnit: true,
        workersNeeded: true,
        atPrivateHome: true,
        createdAt: true,
        updatedAt: true,
        employer: { select: { id: true, displayName: true } },
        category: {
          select: {
            id: true,
            name: true,
            isSensitive: true,
            sensitiveIfHome: true,
          },
        },
        commune: { select: { id: true, name: true } },
      },
    });

    return {
      items: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        amount: job.amount,
        currency: job.currency,
        payUnit: job.payUnit,
        workersNeeded: job.workersNeeded,
        atPrivateHome: job.atPrivateHome,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        employer: job.employer,
        category: job.category,
        commune: job.commune,
      })),
    };
  }

  async approve(adminId: string, jobId: string) {
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, publishedAt: true },
    });
    if (!job) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Offre introuvable.' },
        404,
      );
    }
    if (job.status !== 'IN_REVIEW') {
      throw new HttpException(
        {
          code: 'JOB_NOT_IN_REVIEW',
          message: 'Cette offre n’est pas en modération.',
        },
        409,
      );
    }

    const now = new Date();
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const row = await tx.job.update({
        where: { id: jobId },
        data: {
          status: 'PUBLISHED',
          rejectionReason: null,
          publishedAt: job.publishedAt ?? now,
          expiresAt: null,
        },
        select: { id: true, status: true, publishedAt: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'JOB_APPROVED',
          entityType: 'job',
          entityId: jobId,
          metadata: { previousStatus: job.status },
        },
      });
      return row;
    });

    await this.publicJobsCache.invalidate();
    // Une réapprobation après modification garde `publishedAt` : pas de seconde alerte.
    if (!job.publishedAt) await this.matchQueue.enqueueFirstPublication(jobId);

    return {
      id: updated.id,
      status: updated.status,
      publishedAt: this.toIso(updated.publishedAt),
    };
  }

  async reject(adminId: string, jobId: string, reason: string) {
    const motif = reason.trim();
    if (motif.length < 3 || motif.length > 500) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: 'Motif de rejet invalide.',
        },
        400,
      );
    }

    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true },
    });
    if (!job) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Offre introuvable.' },
        404,
      );
    }
    if (job.status !== 'IN_REVIEW') {
      throw new HttpException(
        {
          code: 'JOB_NOT_IN_REVIEW',
          message: 'Cette offre n’est pas en modération.',
        },
        409,
      );
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const row = await tx.job.update({
        where: { id: jobId },
        data: {
          status: 'REJECTED',
          rejectionReason: motif,
        },
        select: { id: true, status: true, rejectionReason: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'JOB_REJECTED',
          entityType: 'job',
          entityId: jobId,
          metadata: { previousStatus: job.status, reason: motif },
        },
      });
      return row;
    });

    return updated;
  }

  private async assertEmployerCanPublish(userId: string): Promise<{
    subscription: { status: string; endsAt: Date | null };
    subscriptionLabel: string;
  }> {
    const [user, settings] = await Promise.all([
      this.prisma.client.user.findUnique({
        where: { id: userId },
        select: {
          status: true,
          employerProfile: { select: { id: true } },
          subscription: { select: { status: true, endsAt: true } },
        },
      }),
      this.getPlatformSettings(),
    ]);

    if (!user) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Session invalide.' },
        401,
      );
    }
    if (user.status === 'SUSPENDED' || user.status === 'CLOSED') {
      throw new HttpException(
        {
          code: 'FORBIDDEN',
          message: 'Compte suspendu ou fermé — publication impossible.',
        },
        403,
      );
    }

    await this.sessions.assertHasPhone(userId);

    if (!user.employerProfile) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: 'Créez un profil recruteur avant de publier.',
        },
        400,
      );
    }
    if (!user.subscription || user.subscription.status !== 'ACTIVE') {
      throw new HttpException(
        {
          code: 'SUBSCRIPTION_INACTIVE',
          message: 'Votre abonnement n’est pas actif.',
        },
        403,
      );
    }

    return {
      subscription: user.subscription,
      subscriptionLabel: this.subscriptionLabel(settings.servicesPayants),
    };
  }

  private async getPlatformSettings(): Promise<{ servicesPayants: boolean }> {
    const settings = await this.prisma.client.platformSetting.findUnique({
      where: { id: 1 },
      select: { servicesPayants: true },
    });
    return { servicesPayants: settings?.servicesPayants ?? false };
  }

  private subscriptionLabel(servicesPayants: boolean): string {
    return servicesPayants ? 'Services payants' : 'Services gratuits';
  }

  private async loadOwnedJob(
    jobId: string,
    userId: string,
  ): Promise<JobDetailsRow> {
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: JOB_DETAILS_SELECT,
    });
    if (!job || job.employerId !== userId) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Offre introuvable.' },
        404,
      );
    }
    return job;
  }

  private buildDraftPatch(body: JobDraftInput): Prisma.JobUncheckedUpdateInput {
    try {
      const patch: Prisma.JobUncheckedUpdateInput = {};

      if (Object.prototype.hasOwnProperty.call(body, 'title')) {
        patch.title = body.title?.trim() || '(brouillon)';
      }
      if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        patch.description = body.description?.trim() ?? '';
      }
      if (Object.prototype.hasOwnProperty.call(body, 'categoryId')) {
        if (!body.categoryId?.trim()) {
          throw new JobValidationError('Catégorie requise.');
        }
        patch.categoryId = body.categoryId.trim();
      }
      if (Object.prototype.hasOwnProperty.call(body, 'communeId')) {
        if (!body.communeId?.trim()) {
          throw new JobValidationError('Commune requise.');
        }
        patch.communeId = body.communeId.trim();
      }
      if (Object.prototype.hasOwnProperty.call(body, 'publicLandmark')) {
        patch.publicLandmark = this.trimNullable(body.publicLandmark);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'publicLatitude')) {
        patch.publicLatitude = body.publicLatitude ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'publicLongitude')) {
        patch.publicLongitude = body.publicLongitude ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'addressPrivate')) {
        patch.addressPrivate = this.trimNullable(body.addressPrivate);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'privateLatitude')) {
        patch.privateLatitude = body.privateLatitude ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'privateLongitude')) {
        patch.privateLongitude = body.privateLongitude ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'missionPhone')) {
        patch.missionPhone = this.trimNullable(body.missionPhone);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'atPrivateHome')) {
        patch.atPrivateHome = body.atPrivateHome ?? false;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'startAt')) {
        patch.startAt = parseDate(body.startAt, 'Date de début');
      }
      if (Object.prototype.hasOwnProperty.call(body, 'durationHours')) {
        patch.durationHours = body.durationHours ?? 4;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'workersNeeded')) {
        patch.workersNeeded = body.workersNeeded ?? 1;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'amount')) {
        patch.amount = body.amount ?? 0;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'currency')) {
        patch.currency = body.currency ?? 'USD';
      }
      if (Object.prototype.hasOwnProperty.call(body, 'payUnit')) {
        patch.payUnit = body.payUnit ?? 'MISSION';
      }
      if (Object.prototype.hasOwnProperty.call(body, 'payChannel')) {
        patch.payChannel = body.payChannel ?? 'CASH';
      }
      if (Object.prototype.hasOwnProperty.call(body, 'payTiming')) {
        patch.payTiming = this.trimNullable(body.payTiming);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'skillsRequired')) {
        patch.skillsRequired = this.trimNullable(body.skillsRequired);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'materialConditions')) {
        patch.materialConditions = this.trimNullable(body.materialConditions);
      }
      if (Object.prototype.hasOwnProperty.call(body, 'transportSupport')) {
        patch.transportSupport = body.transportSupport ?? false;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'mealsSupport')) {
        patch.mealsSupport = body.mealsSupport ?? false;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'equipmentSupport')) {
        patch.equipmentSupport = body.equipmentSupport ?? false;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'applyDeadline')) {
        patch.applyDeadline = parseDate(
          body.applyDeadline,
          'Date limite de candidature',
        );
      }
      if (Object.prototype.hasOwnProperty.call(body, 'selectionDeadline')) {
        patch.selectionDeadline = parseDate(
          body.selectionDeadline,
          'Date limite de sélection',
        );
      }

      return patch;
    } catch (err) {
      validationHttp(err);
    }
  }

  private mergeJobSnapshot(
    job: JobDetailsRow,
    patch: Prisma.JobUncheckedUpdateInput,
  ): Record<string, unknown> {
    return {
      title: patch.title ?? job.title,
      description: patch.description ?? job.description,
      categoryId: patch.categoryId ?? job.categoryId,
      communeId: patch.communeId ?? job.communeId,
      publicLandmark: patch.publicLandmark ?? job.publicLandmark,
      publicLatitude: patch.publicLatitude ?? job.publicLatitude,
      publicLongitude: patch.publicLongitude ?? job.publicLongitude,
      addressPrivate: patch.addressPrivate ?? job.addressPrivate,
      privateLatitude: patch.privateLatitude ?? job.privateLatitude,
      privateLongitude: patch.privateLongitude ?? job.privateLongitude,
      missionPhone: patch.missionPhone ?? job.missionPhone,
      atPrivateHome: patch.atPrivateHome ?? job.atPrivateHome,
      startAt: patch.startAt ?? job.startAt,
      durationHours: patch.durationHours ?? job.durationHours,
      workersNeeded: patch.workersNeeded ?? job.workersNeeded,
      amount: patch.amount ?? job.amount,
      currency: patch.currency ?? job.currency,
      payUnit: patch.payUnit ?? job.payUnit,
      payChannel: patch.payChannel ?? job.payChannel,
      payTiming: patch.payTiming ?? job.payTiming,
      skillsRequired: patch.skillsRequired ?? job.skillsRequired,
      materialConditions: patch.materialConditions ?? job.materialConditions,
      transportSupport: patch.transportSupport ?? job.transportSupport,
      mealsSupport: patch.mealsSupport ?? job.mealsSupport,
      equipmentSupport: patch.equipmentSupport ?? job.equipmentSupport,
      applyDeadline: patch.applyDeadline ?? job.applyDeadline,
      selectionDeadline: patch.selectionDeadline ?? job.selectionDeadline,
    };
  }

  private hasSubstantialChange(
    job: JobDetailsRow,
    nextSnapshot: Record<string, unknown>,
  ): boolean {
    return SUBSTANTIAL_KEYS.some(
      (key) => !this.valuesEqual(job[key], nextSnapshot[key]),
    );
  }

  private valuesEqual(left: unknown, right: unknown): boolean {
    if (left instanceof Date && right instanceof Date) {
      return left.getTime() === right.getTime();
    }
    return left === right;
  }

  private trimNullable(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private toIso(value: Date | null | undefined): string | null {
    return value ? value.toISOString() : null;
  }

  private toOwnerJobView(job: JobDetailsRow) {
    const now = new Date();
    const confirmedParticipations = job._count.participations;
    const placesRemaining = Math.max(
      0,
      job.workersNeeded - confirmedParticipations,
    );
    const applicationsOpen =
      job.status === 'PUBLISHED' &&
      placesRemaining > 0 &&
      job.applyDeadline > now;

    return {
      id: job.id,
      employerId: job.employerId,
      title: job.title,
      description: job.description,
      categoryId: job.categoryId,
      category: { id: job.category.id, name: job.category.name },
      communeId: job.communeId,
      commune: { id: job.commune.id, name: job.commune.name },
      publicLandmark: job.publicLandmark,
      publicLatitude: job.publicLatitude,
      publicLongitude: job.publicLongitude,
      addressPrivate: job.addressPrivate,
      privateLatitude: job.privateLatitude,
      privateLongitude: job.privateLongitude,
      missionPhone: job.missionPhone,
      atPrivateHome: job.atPrivateHome,
      startAt: job.startAt.toISOString(),
      durationHours: job.durationHours,
      workersNeeded: job.workersNeeded,
      amount: job.amount,
      currency: job.currency,
      payUnit: job.payUnit,
      payChannel: job.payChannel,
      payTiming: job.payTiming,
      skillsRequired: job.skillsRequired,
      materialConditions: job.materialConditions,
      transportSupport: job.transportSupport,
      mealsSupport: job.mealsSupport,
      equipmentSupport: job.equipmentSupport,
      applyDeadline: job.applyDeadline.toISOString(),
      selectionDeadline: job.selectionDeadline.toISOString(),
      status: job.status,
      rejectionReason: job.rejectionReason,
      currentVersionId: job.currentVersionId,
      publishedAt: this.toIso(job.publishedAt),
      expiresAt: this.toIso(job.expiresAt),
      featured: job.isFeatured && !!job.featuredUntil && job.featuredUntil > now,
      featuredUntil: this.toIso(job.featuredUntil),
      applicationsCount: job._count.applications,
      confirmedParticipationsCount: confirmedParticipations,
      placesRemaining,
      applicationsOpen,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  private async toPublicJobDetail(
    job: JobDetailsRow,
    detailViewCount = job.detailViewCount,
  ): Promise<PublicJobDetailDto> {
    const now = new Date();
    const occupied = await this.countOccupiedPlaces(job.id);
    const placesRemaining = Math.max(0, job.workersNeeded - occupied);
    const featured = !!(job.featuredUntil && job.featuredUntil > now);
    const applicationsOpen =
      job.status === 'PUBLISHED' &&
      placesRemaining > 0 &&
      job.applyDeadline > now;
    const closed = closedMessageFor(job.status) != null;

    const base = toPublicJobDto({
      id: job.id,
      title: job.title,
      category: job.category.name,
      amount: job.amount,
      currency: job.currency,
      payUnit: job.payUnit,
      startAt: job.startAt,
      durationHours: job.durationHours,
      commune: job.commune.name,
      publicLandmark: job.publicLandmark,
      publicLatitude: job.publicLatitude,
      publicLongitude: job.publicLongitude,
      placesRemaining,
      featured,
      applicationsOpen,
      publishedAt: job.publishedAt,
      detailViewCount,
      publisher: toPublicPublisher({
        userId: job.employer.id,
        userDisplayName: job.employer.displayName,
        avatarUrl: job.employer.avatarUrl,
        employerDisplayName: job.employer.employerProfile?.displayName ?? null,
        accountStatus: job.employer.status,
      }),
      includeCoords: !closed,
    });

    return {
      ...base,
      description: job.description,
      status: job.status,
      workersNeeded: job.workersNeeded,
      closedMessage: closedMessageFor(job.status),
      distanceLabel: 'position non partagée',
    };
  }

  /** Profil public d’un recruteur. Aucun téléphone, e-mail ou adresse privée. */
  async getPublicPublisher(userId: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      )
    ) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Profil introuvable.' },
        404,
      );
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        displayName: true,
        avatarUrl: true,
        employerProfile: {
          select: {
            displayName: true,
            type: true,
            presentation: true,
            commune: { select: { name: true } },
          },
        },
      },
    });
    const profile = user?.employerProfile;
    if (
      !user ||
      !profile ||
      (user.status !== 'ACTIVE' && user.status !== 'INCOMPLETE')
    ) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Profil introuvable.' },
        404,
      );
    }

    const now = new Date();
    const rows = await this.prisma.client.job.findMany({
      where: { employerId: user.id, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        payUnit: true,
        startAt: true,
        durationHours: true,
        publicLandmark: true,
        publicLatitude: true,
        publicLongitude: true,
        workersNeeded: true,
        featuredUntil: true,
        applyDeadline: true,
        publishedAt: true,
        detailViewCount: true,
        status: true,
        category: { select: { name: true } },
        commune: { select: { name: true } },
      },
    });

    const publisher = toPublicPublisher({
      userId: user.id,
      userDisplayName: user.displayName,
      avatarUrl: user.avatarUrl,
      employerDisplayName: profile.displayName,
      accountStatus: user.status,
    });

    const jobs: PublicJobDto[] = [];
    for (const job of rows) {
      let status: JobStatus = job.status;
      if (job.applyDeadline <= now) {
        const lifecycle = await this.ensureJobLifecycleStatus(job.id);
        status = lifecycle.status as JobStatus;
      }
      if (status !== 'PUBLISHED') continue;
      const occupied = await this.countOccupiedPlaces(job.id);
      const placesRemaining = Math.max(0, job.workersNeeded - occupied);
      jobs.push(
        toPublicJobDto({
          id: job.id,
          title: job.title,
          category: job.category.name,
          amount: job.amount,
          currency: job.currency,
          payUnit: job.payUnit,
          startAt: job.startAt,
          durationHours: job.durationHours,
          commune: job.commune.name,
          publicLandmark: job.publicLandmark,
          publicLatitude: job.publicLatitude,
          publicLongitude: job.publicLongitude,
          placesRemaining,
          featured: !!(job.featuredUntil && job.featuredUntil > now),
          applicationsOpen: placesRemaining > 0 && job.applyDeadline > now,
          publishedAt: job.publishedAt,
          detailViewCount: job.detailViewCount,
          publisher,
        }),
      );
    }

    return {
      name: publisher.name,
      avatarUrl: publisher.avatarUrl,
      kind: profile.type,
      commune: profile.commune?.name ?? null,
      presentation: profile.presentation,
      jobs,
    };
  }

  /** Proposition vue par le candidat. Une PENDING échue est déjà « expirée » pour lui, même avant le worker. */
  private offerView(
    offer: { id: string; status: string; expiresAt: Date } | undefined,
    now: Date,
  ) {
    if (!offer) return null;
    const expired =
      offer.status === 'EXPIRED' || (offer.status === 'PENDING' && offer.expiresAt <= now);
    return {
      id: offer.id,
      status: expired ? 'EXPIRED' : offer.status,
      expiresAt: offer.expiresAt.toISOString(),
      expired,
    };
  }

  /** D03 : propositions PENDING non expirées + participations non annulées, à l’heure applicative. */
  private async countOccupiedPlaces(jobId: string): Promise<number> {
    const now = await this.clock.now();
    const [pendingOffers, participations] = await Promise.all([
      this.prisma.client.selectionOffer.count({
        where: {
          status: 'PENDING',
          expiresAt: { gt: now },
          application: { jobId },
        },
      }),
      this.prisma.client.participation.count({
        where: {
          jobId,
          status: { not: 'CANCELLED' },
        },
      }),
    ]);
    return pendingOffers + participations;
  }

  /** Bornes [start, end) pour un jour calendaire Africa/Kinshasa (YYYY-MM-DD). */
  private kinshasaDayBounds(
    ymd: string,
  ): { start: Date; end: Date } | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
    const start = new Date(`${ymd}T00:00:00+01:00`);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private async hasEverPublished(employerId: string): Promise<boolean> {
    const row = await this.prisma.client.job.findFirst({
      where: { employerId, publishedAt: { not: null } },
      select: { id: true },
    });
    return !!row;
  }
}
