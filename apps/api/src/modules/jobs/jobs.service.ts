import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../identity/profile.service';
import { SessionService } from '../identity/session.service';

/**
 * Portail publication / candidature — étape 11.
 * Formulaire d’offre complet = étape 12 ; candidature complète = étape 15.
 * Ici : gardes d’accès uniquement.
 */
@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly profiles: ProfileService,
  ) {}

  /**
   * Liste publique minimale (étape 11 — accueil).
   * Filtres / détail / partage = étape 13.
   */
  async listPublicJobs() {
    const jobs = await this.prisma.client.job.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }],
      take: 20,
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        payUnit: true,
        startAt: true,
        durationHours: true,
        publicLandmark: true,
        workersNeeded: true,
        featuredUntil: true,
        applyDeadline: true,
        category: { select: { name: true } },
        commune: { select: { name: true } },
        _count: {
          select: {
            participations: {
              where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
            },
          },
        },
      },
    });

    const now = new Date();
    return {
      items: jobs.map((job) => {
        const placesRemaining = Math.max(
          0,
          job.workersNeeded - job._count.participations,
        );
        const applicationsOpen =
          placesRemaining > 0 &&
          (!job.applyDeadline || job.applyDeadline > now);
        return {
          id: job.id,
          title: job.title,
          category: job.category.name,
          amount: job.amount,
          currency: job.currency,
          payUnit: job.payUnit,
          startAt: job.startAt.toISOString(),
          durationHours: job.durationHours,
          commune: job.commune.name,
          publicLandmark: job.publicLandmark,
          placesRemaining,
          featured: !!(job.featuredUntil && job.featuredUntil > now),
          applicationsOpen,
        };
      }),
    };
  }

  async createJobGate(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        phone: true,
        employerProfile: { select: { id: true } },
        subscription: { select: { status: true, endsAt: true } },
      },
    });
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
      ok: true as const,
      status: 'DRAFT' as const,
      message:
        'Abonnement actif. Le formulaire de création d’offre arrive à l’étape 12.',
      subscription: {
        status: user.subscription.status,
        endsAt: user.subscription.endsAt,
        label: 'Services gratuits',
      },
    };
  }

  async applyGate(userId: string, jobId: string) {
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

    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, employerId: true },
    });
    if (!job) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Offre introuvable.' },
        404,
      );
    }
    if (job.employerId === userId) {
      throw new HttpException(
        { code: 'OWN_JOB', message: 'Vous ne pouvez pas candidater sur votre offre.' },
        409,
      );
    }

    return {
      ok: true as const,
      jobId: job.id,
      message:
        'Profil complet. La candidature réelle arrive à l’étape 15.',
    };
  }
}
