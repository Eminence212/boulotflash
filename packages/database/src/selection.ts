import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Sélection (étape 16) — règles partagées entre l’API et le worker.
 *
 * Invariant de capacité (D03) :
 *   occupées = propositions PENDING non expirées + participations dont status <> CANCELLED
 * Une proposition ACCEPTED ne compte plus comme réservation : sa participation prend le relais.
 *
 * Ordre de verrouillage, identique pour toutes les écritures de sélection :
 *   1. ligne `jobs` (SELECT … FOR UPDATE)  2. proposition  3. candidature  4. participation
 * Le verrou est pris dans Postgres : il tient entre plusieurs instances de l’API et le worker.
 */

type Tx = Prisma.TransactionClient;

export type InAppNotification = {
  userId: string;
  templateKey: string;
  title: string;
  message: string;
  relatedType: string;
  relatedId: string;
  /** Unique par utilisateur : un rejeu n’écrit pas une seconde ligne. */
  dedupeKey: string;
};

/** Verrouille la ligne de l’offre. Toute écriture de sélection commence par là. */
export async function lockJobRow(tx: Tx, jobId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM jobs WHERE id = ${jobId}::uuid FOR UPDATE`;
}

/** Places occupées selon D03, à appeler sous le verrou de l’offre. */
export async function countOccupied(tx: Tx, jobId: string, now: Date): Promise<number> {
  const [pending, participations] = await Promise.all([
    tx.selectionOffer.count({
      where: { status: 'PENDING', expiresAt: { gt: now }, application: { jobId } },
    }),
    tx.participation.count({ where: { jobId, status: { not: 'CANCELLED' } } }),
  ]);
  return pending + participations;
}

/** Lignes in-app minimales (étape 18 généralisera). Doublons ignorés grâce à (user_id, dedupe_key). */
export async function insertInAppNotifications(
  tx: Tx,
  rows: InAppNotification[],
  now: Date,
): Promise<void> {
  if (rows.length === 0) return;
  await tx.notification.createMany({
    data: rows.map((row) => ({
      ...row,
      channel: 'IN_APP' as const,
      status: 'SENT' as const,
      sentAt: now,
    })),
    skipDuplicates: true,
  });
}

/**
 * Expire une proposition échue. Idempotent : seul le passage PENDING → EXPIRED écrit,
 * donc worker, balayage, déclin et acceptation concurrents ne produisent qu’un effet.
 * Retourne true si cet appel a effectivement expiré la proposition.
 */
export async function expireSelectionOffer(
  prisma: PrismaClient,
  offerId: string,
  now: Date,
): Promise<boolean> {
  const head = await prisma.selectionOffer.findUnique({
    where: { id: offerId },
    select: { application: { select: { jobId: true } } },
  });
  if (!head) return false;
  return prisma.$transaction((tx) => expireOfferInTx(tx, offerId, head.application.jobId, now));
}

/** Même effet, dans une transaction qui détient déjà le verrou de l’offre. */
export async function expireOfferInTx(
  tx: Tx,
  offerId: string,
  jobId: string,
  now: Date,
): Promise<boolean> {
  await lockJobRow(tx, jobId);
  const updated = await tx.selectionOffer.updateMany({
    where: { id: offerId, status: 'PENDING', expiresAt: { lte: now } },
    data: { status: 'EXPIRED' },
  });
  if (updated.count === 0) return false;

  const offer = await tx.selectionOffer.findUniqueOrThrow({
    where: { id: offerId },
    select: {
      applicationId: true,
      application: {
        select: { workerId: true, job: { select: { title: true, employerId: true } } },
      },
    },
  });
  await tx.application.updateMany({
    where: { id: offer.applicationId, status: 'OFFERED' },
    data: { status: 'EXPIRED' },
  });
  const { workerId, job } = offer.application;
  await insertInAppNotifications(
    tx,
    [
      {
        userId: workerId,
        templateKey: 'selection_offer_expired',
        title: 'Proposition expirée',
        message: `La proposition pour « ${job.title} » a expiré.`,
        relatedType: 'selection_offer',
        relatedId: offerId,
        dedupeKey: `selection_offer_expired:${offerId}`,
      },
      {
        userId: job.employerId,
        templateKey: 'selection_offer_expired',
        title: 'Proposition expirée',
        message: `Votre proposition pour « ${job.title} » a expiré. La place est de nouveau libre.`,
        relatedType: 'selection_offer',
        relatedId: offerId,
        dedupeKey: `selection_offer_expired:${offerId}`,
      },
    ],
    now,
  );
  return true;
}

/** Balayage : expire toutes les propositions PENDING échues à `now`. Rejouable sans effet en double. */
export async function sweepExpiredOffers(
  prisma: PrismaClient,
  now: Date,
  limit = 500,
): Promise<{ expired: number; scanned: number }> {
  const due = await prisma.selectionOffer.findMany({
    where: { status: 'PENDING', expiresAt: { lte: now } },
    select: { id: true },
    orderBy: { expiresAt: 'asc' },
    take: limit,
  });
  let expired = 0;
  for (const { id } of due) {
    if (await expireSelectionOffer(prisma, id, now)) expired += 1;
  }
  return { expired, scanned: due.length };
}

export const SELECTION_QUEUE = 'selection-offers';
export const EXPIRE_JOB = 'expire';
