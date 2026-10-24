import type { PrismaClient } from '@prisma/client';
import { jobFacts, kinshasaWeekdaySlot } from './notification-text';
import { insertInAppNotifications } from './selection';

/**
 * Alerte « une mission correspond à votre profil » (étape 18, CDC §8.3).
 * Mise en file au premier passage en PUBLISHED, traitée par le worker `match-profiles`.
 * Rejouable : l’unicité `job_profile_alerts (job_id, user_id)` et `notifications (user_id, dedupe_key)`
 * empêchent tout doublon. Canal IN_APP seulement : ni e-mail, ni push.
 */
export const MATCH_QUEUE = 'match-profiles';
export const MATCH_JOB = 'match-job';

export type MatchCandidate = {
  userId: string;
  userStatus: string;
  isAvailable: boolean;
  displayName: string | null;
  communeId: string | null;
  mainCategoryId: string | null;
  skillCategoryIds: string[];
  availability: { weekday: number; slot: string }[];
};

export type MatchJob = {
  employerId: string;
  categoryId: string;
  communeId: string;
  startAt: Date;
};

/** Raison du refus, ou null si le profil correspond. Même notion de profil complet que `/me`. */
export function matchMismatch(candidate: MatchCandidate, job: MatchJob): string | null {
  if (candidate.userId === job.employerId) return 'auteur';
  if (candidate.userStatus !== 'ACTIVE') return 'compte';
  const complete =
    (candidate.displayName?.trim().length ?? 0) >= 2 &&
    !!candidate.communeId &&
    !!candidate.mainCategoryId &&
    candidate.availability.length > 0;
  if (!complete) return 'incomplet';
  if (!candidate.isAvailable) return 'indisponible';
  if (candidate.mainCategoryId !== job.categoryId && !candidate.skillCategoryIds.includes(job.categoryId)) {
    return 'competence';
  }
  if (candidate.communeId !== job.communeId) return 'commune';
  const { weekday, slot } = kinshasaWeekdaySlot(job.startAt);
  if (!candidate.availability.some((a) => a.weekday === weekday && a.slot === slot)) return 'creneau';
  return null;
}

export function profileMatchesJob(candidate: MatchCandidate, job: MatchJob): boolean {
  return matchMismatch(candidate, job) === null;
}

export type MatchRunResult =
  | { jobId: string; skipped: string }
  | { jobId: string; matched: number; alertsCreated: number; notificationsCreated: number };

/** Calcule les profils correspondants et écrit alertes et notifications, sans doublon. */
export async function runJobMatch(prisma: PrismaClient, jobId: string, now = new Date()): Promise<MatchRunResult> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      employerId: true,
      categoryId: true,
      communeId: true,
      startAt: true,
      title: true,
      amount: true,
      currency: true,
      payUnit: true,
      commune: { select: { name: true } },
    },
  });
  if (!job) return { jobId, skipped: 'introuvable' };
  // Offre suspendue, annulée ou pourvue entre-temps : une alerte n’aurait plus d’objet.
  if (job.status !== 'PUBLISHED') return { jobId, skipped: `statut ${job.status}` };
  if (job.startAt <= now) return { jobId, skipped: 'commencée' };

  const { weekday, slot } = kinshasaWeekdaySlot(job.startAt);
  // Présélection SQL large, puis le filtre exact ci-dessus (une seule définition de la règle).
  const profiles = await prisma.workerProfile.findMany({
    where: {
      communeId: job.communeId,
      isAvailable: true,
      userId: { not: job.employerId },
      user: { status: 'ACTIVE' },
      OR: [{ mainCategoryId: job.categoryId }, { skills: { some: { categoryId: job.categoryId } } }],
      availability: { some: { weekday, slot } },
    },
    select: {
      userId: true,
      isAvailable: true,
      displayName: true,
      communeId: true,
      mainCategoryId: true,
      user: { select: { status: true } },
      skills: { select: { categoryId: true } },
      availability: { select: { weekday: true, slot: true } },
    },
  });
  const target: MatchJob = {
    employerId: job.employerId,
    categoryId: job.categoryId,
    communeId: job.communeId,
    startAt: job.startAt,
  };
  const userIds = profiles
    .filter((p) =>
      profileMatchesJob(
        {
          userId: p.userId,
          userStatus: p.user.status,
          isAvailable: p.isAvailable,
          displayName: p.displayName,
          communeId: p.communeId,
          mainCategoryId: p.mainCategoryId,
          skillCategoryIds: p.skills.map((s) => s.categoryId),
          availability: p.availability,
        },
        target,
      ),
    )
    .map((p) => p.userId);
  if (userIds.length === 0) {
    return { jobId, matched: 0, alertsCreated: 0, notificationsCreated: 0 };
  }

  const facts = jobFacts({
    title: job.title,
    startAt: job.startAt,
    commune: job.commune.name,
    amount: job.amount,
    currency: job.currency,
    payUnit: job.payUnit,
  });
  return prisma.$transaction(async (tx) => {
    const alerts = await tx.jobProfileAlert.createMany({
      data: userIds.map((userId) => ({ jobId, userId })),
      skipDuplicates: true,
    });
    const notifications = await insertInAppNotifications(
      tx,
      userIds.map((userId) => ({
        userId,
        templateKey: 'job_match',
        title: 'Une mission correspond à votre profil',
        message: `${facts}. Ouvrez l’offre pour postuler ; l’adresse exacte n’est pas dans ce message.`,
        relatedType: 'job',
        relatedId: jobId,
        dedupeKey: `job_match:${jobId}`,
      })),
      now,
    );
    return { jobId, matched: userIds.length, alertsCreated: alerts.count, notificationsCreated: notifications };
  });
}
