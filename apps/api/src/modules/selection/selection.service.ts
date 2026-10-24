import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { labelFr } from '@boulotflash/contracts';
import {
  countOccupied,
  expireOfferInTx,
  insertInAppNotifications,
  lockJobRow,
  sweepExpiredOffers,
} from '@boulotflash/database';
import { PrismaService } from '../prisma/prisma.service';
import { PublicJobsCacheService } from '../redis-cache/public-jobs-cache.service';
import { jobSnapshot } from '../jobs/job-fields';
import { ClockService } from './clock.service';
import { SelectionQueueService } from './selection-queue.service';

type Tx = Prisma.TransactionClient;
type Outcome = { httpStatus: number; body: Record<string, unknown> };

export const SLOT_FULL_MESSAGE = "Il n'y a plus de place à réserver.";
export const PROPOSAL_EXPIRED_MESSAGE = 'Cette proposition a expiré.';
/** D04 — hypothèse non validée (REGISTRE_DECISIONS) : refuser plutôt que raccourcir le délai. */
export const PROPOSAL_TOO_SHORT_MESSAGE =
  'La clôture des sélections est dans moins de 2 heures. Allongez-la avant de proposer une place.';

const NOT_FOUND = { code: 'NOT_FOUND', message: 'Candidature introuvable.' };
const OFFER_NOT_FOUND = { code: 'NOT_FOUND', message: 'Proposition introuvable.' };

function fail(httpStatus: number, code: string, message: string): never {
  throw new HttpException({ code, message }, httpStatus);
}

function isUniqueViolation(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

@Injectable()
export class SelectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly queue: SelectionQueueService,
    private readonly publicJobsCache: PublicJobsCacheService,
  ) {}

  // ---------------------------------------------------------------- recruteur

  /** Candidatures d’une offre, pour son seul propriétaire. Jamais le numéro de téléphone. */
  async listForEmployer(userId: string, jobId: string) {
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
        employerId: true,
        workersNeeded: true,
        selectionDeadline: true,
      },
    });
    if (!job || job.employerId !== userId) {
      fail(404, 'NOT_FOUND', 'Offre introuvable.');
    }
    const now = await this.clock.now();
    const occupied = await countOccupied(this.prisma.client, jobId, now);
    const rows = await this.prisma.client.application.findMany({
      where: { jobId },
      orderBy: { appliedAt: 'asc' },
      select: {
        id: true,
        status: true,
        message: true,
        appliedAt: true,
        worker: {
          select: {
            phone: true,
            workerProfile: {
              select: {
                displayName: true,
                isAvailable: true,
                commune: { select: { name: true } },
                mainCategory: { select: { name: true } },
                skills: { select: { category: { select: { name: true } } } },
                availability: { select: { weekday: true, slot: true } },
              },
            },
          },
        },
        selectionOffers: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, expiresAt: true },
        },
      },
    });
    return {
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        statusLabel: labelFr(job.status),
        workersNeeded: job.workersNeeded,
        occupied,
        placesRemaining: Math.max(0, job.workersNeeded - occupied),
        selectionDeadline: job.selectionDeadline.toISOString(),
      },
      items: rows.map((row) => {
        const profile = row.worker.workerProfile;
        const skills = new Set<string>();
        if (profile?.mainCategory) skills.add(profile.mainCategory.name);
        for (const s of profile?.skills ?? []) skills.add(s.category.name);
        const offer = row.selectionOffers[0] ?? null;
        return {
          id: row.id,
          status: row.status,
          statusLabel: labelFr(row.status),
          appliedAt: row.appliedAt.toISOString(),
          message: row.message,
          candidate: {
            displayName: profile?.displayName ?? 'Candidat',
            commune: profile?.commune?.name ?? null,
            skills: [...skills],
            isAvailable: profile?.isAvailable ?? false,
            availability: (profile?.availability ?? []).map((a) => ({
              weekday: a.weekday,
              slot: a.slot,
            })),
            // Badge seulement : le numéro reste privé jusqu’à l’acceptation (BF-SEL-01, étape 17).
            phoneBadge: !!row.worker.phone,
          },
          offer: offer
            ? {
                id: offer.id,
                status: offer.status,
                expiresAt: offer.expiresAt.toISOString(),
                expired: offer.status === 'PENDING' && offer.expiresAt <= now,
              }
            : null,
        };
      }),
    };
  }

  /** Présélection : ne réserve aucune place, ne crée aucune ligne selection_offers. */
  async shortlist(userId: string, applicationId: string) {
    const app = await this.ownedApplication(userId, applicationId);
    await this.prisma.client.$transaction(async (tx) => {
      await lockJobRow(tx, app.jobId);
      const updated = await tx.application.updateMany({
        where: { id: app.id, status: 'SUBMITTED' },
        data: { status: 'SHORTLISTED' },
      });
      if (updated.count > 0) return;
      const current = await tx.application.findUnique({
        where: { id: app.id },
        select: { status: true },
      });
      if (current?.status !== 'SHORTLISTED') {
        fail(409, 'VALIDATION', 'Cette candidature ne peut plus être présélectionnée.');
      }
    });
    return { id: app.id, status: 'SHORTLISTED', statusLabel: labelFr('SHORTLISTED') };
  }

  /** Refus : notification in-app seulement. */
  async reject(userId: string, applicationId: string) {
    const app = await this.ownedApplication(userId, applicationId);
    const now = await this.clock.now();
    await this.prisma.client.$transaction(async (tx) => {
      await lockJobRow(tx, app.jobId);
      const updated = await tx.application.updateMany({
        where: { id: app.id, status: { in: ['SUBMITTED', 'SHORTLISTED'] } },
        data: { status: 'REJECTED' },
      });
      if (updated.count === 0) {
        const current = await tx.application.findUnique({
          where: { id: app.id },
          select: { status: true },
        });
        if (current?.status === 'REJECTED') return;
        fail(409, 'VALIDATION', 'Cette candidature ne peut plus être refusée.');
      }
      await insertInAppNotifications(
        tx,
        [
          {
            userId: app.workerId,
            templateKey: 'application_rejected',
            title: 'Candidature non retenue',
            message: `Votre candidature pour « ${app.jobTitle} » n’a pas été retenue.`,
            relatedType: 'application',
            relatedId: app.id,
            dedupeKey: `application_rejected:${app.id}`,
          },
        ],
        now,
      );
    });
    return { id: app.id, status: 'REJECTED', statusLabel: labelFr('REJECTED') };
  }

  /** Proposition d’une place : réserve sous verrou de l’offre, échéance calculée par le serveur. */
  async offer(userId: string, applicationId: string, idempotencyKey: string | undefined): Promise<Outcome> {
    const app = await this.ownedApplication(userId, applicationId);
    const settings = await this.prisma.client.platformSetting.findUnique({
      where: { id: 1 },
      select: { proposalMinHours: true },
    });
    const minMs = (settings?.proposalMinHours ?? 2) * 60 * 60 * 1000;

    let created: { id: string; expiresAt: Date; now: Date } | null = null;
    const outcome = await this.idempotent(userId, idempotencyKey, `offer:${applicationId}`, app.jobId, async (tx) => {
      const now = await this.clock.now();
      const job = await tx.job.findUniqueOrThrow({
        where: { id: app.jobId },
        select: {
          id: true,
          title: true,
          status: true,
          workersNeeded: true,
          selectionDeadline: true,
          currentVersionId: true,
        },
      });
      const current = await tx.application.findUniqueOrThrow({
        where: { id: app.id },
        select: { status: true },
      });

      if (job.status === 'FILLED') fail(409, 'SLOT_FULL', SLOT_FULL_MESSAGE);
      if (job.status !== 'PUBLISHED') {
        fail(409, 'OFFER_NOT_OPEN', 'Cette offre ne permet plus de proposer une place.');
      }
      if (current.status === 'OFFERED') {
        fail(409, 'VALIDATION', 'Une proposition est déjà en cours pour cette candidature.');
      }
      if (current.status !== 'SUBMITTED' && current.status !== 'SHORTLISTED') {
        fail(409, 'VALIDATION', 'Cette candidature ne peut plus recevoir de proposition.');
      }
      // D04 : échéance = maintenant + minimum, plafonnée à la clôture ; si le plafond tombe avant le minimum, refus.
      const minimumEnd = new Date(now.getTime() + minMs);
      if (job.selectionDeadline < minimumEnd) {
        fail(409, 'PROPOSAL_TOO_SHORT', PROPOSAL_TOO_SHORT_MESSAGE);
      }
      const expiresAt = new Date(Math.min(minimumEnd.getTime(), job.selectionDeadline.getTime()));

      const occupied = await countOccupied(tx, job.id, now);
      if (occupied >= job.workersNeeded) fail(409, 'SLOT_FULL', SLOT_FULL_MESSAGE);

      const jobVersionId = job.currentVersionId ?? (await this.freezeVersion(tx, job.id, userId));
      const offer = await tx.selectionOffer.create({
        data: { applicationId: app.id, jobVersionId, expiresAt, status: 'PENDING', reservedSlot: true },
        select: { id: true },
      });
      // Conditionnel : un retrait (étape 15) concurrent ne doit pas être écrasé.
      const moved = await tx.application.updateMany({
        where: { id: app.id, status: { in: ['SUBMITTED', 'SHORTLISTED'] } },
        data: { status: 'OFFERED' },
      });
      if (moved.count === 0) fail(409, 'VALIDATION', 'Cette candidature ne peut plus recevoir de proposition.');
      await insertInAppNotifications(
        tx,
        [
          {
            userId: app.workerId,
            templateKey: 'selection_offer_created',
            title: 'Une place vous est proposée',
            message: `Répondez avant l’échéance pour « ${job.title} ».`,
            relatedType: 'selection_offer',
            relatedId: offer.id,
            dedupeKey: `selection_offer_created:${offer.id}`,
          },
        ],
        now,
      );
      created = { id: offer.id, expiresAt, now };
      return {
        httpStatus: 201,
        body: {
          id: offer.id,
          applicationId: app.id,
          status: 'PENDING',
          applicationStatus: 'OFFERED',
          expiresAt: expiresAt.toISOString(),
          placesRemaining: Math.max(0, job.workersNeeded - occupied - 1),
        },
      };
    });
    const fresh = created as { id: string; expiresAt: Date; now: Date } | null;
    if (fresh) await this.queue.scheduleExpiry(fresh.id, fresh.expiresAt, fresh.now);
    return outcome;
  }

  // ---------------------------------------------------------------- candidat

  /**
   * Acceptation. Sous verrou de l’offre : PENDING → ACCEPTED, participation CONFIRMED,
   * candidature ACCEPTED, puis recomptage des participations avant validation.
   * Pas d’adresse ni de contact à cette étape (étape 17).
   */
  async accept(userId: string, offerId: string, idempotencyKey: string | undefined): Promise<Outcome> {
    const head = await this.ownedOffer(userId, offerId);
    let filled = false;
    const outcome = await this.idempotent(userId, idempotencyKey, `accept:${offerId}`, head.jobId, async (tx) => {
      const now = await this.clock.now();
      const offer = await tx.selectionOffer.findUniqueOrThrow({
        where: { id: offerId },
        select: { status: true, expiresAt: true, jobVersionId: true },
      });

      if (offer.status === 'ACCEPTED') {
        // Double clic avec une autre clé : même résultat, aucune seconde participation.
        const existing = await tx.participation.findUniqueOrThrow({
          where: { selectionOfferId: offerId },
          select: { id: true, status: true },
        });
        return this.acceptedBody(existing.id, existing.status);
      }
      if (offer.status === 'EXPIRED') {
        return { httpStatus: 409, body: { code: 'PROPOSAL_EXPIRED', message: PROPOSAL_EXPIRED_MESSAGE } };
      }
      if (offer.status !== 'PENDING') {
        fail(409, 'VALIDATION', 'Cette proposition n’est plus active.');
      }
      if (offer.expiresAt <= now) {
        // Échue mais pas encore balayée : on l’expire ici, la place se libère, et on refuse.
        await expireOfferInTx(tx, offerId, head.jobId, now);
        return { httpStatus: 409, body: { code: 'PROPOSAL_EXPIRED', message: PROPOSAL_EXPIRED_MESSAGE } };
      }

      const job = await tx.job.findUniqueOrThrow({
        where: { id: head.jobId },
        select: { workersNeeded: true, status: true, employerId: true, title: true },
      });
      await tx.selectionOffer.update({ where: { id: offerId }, data: { status: 'ACCEPTED' } });
      const participation = await tx.participation.create({
        data: {
          jobId: head.jobId,
          applicationId: head.applicationId,
          selectionOfferId: offerId,
          workerId: userId,
          employerId: job.employerId,
          jobVersionId: offer.jobVersionId,
          status: 'CONFIRMED',
        },
        select: { id: true, status: true },
      });
      await tx.application.update({ where: { id: head.applicationId }, data: { status: 'ACCEPTED' } });

      // Recomptage avant validation (BF-SEL-03). Les participations sont les places fermes ;
      // dans tout état atteignable par le parcours, ce contrôle équivaut à l’invariant complet,
      // car l’acceptation convertit une réservation en participation sans changer le total.
      const confirmed = await tx.participation.count({
        where: { jobId: head.jobId, status: { not: 'CANCELLED' } },
      });
      if (confirmed > job.workersNeeded) fail(409, 'SLOT_FULL', SLOT_FULL_MESSAGE);
      if (confirmed === job.workersNeeded && job.status === 'PUBLISHED') {
        await tx.job.update({ where: { id: head.jobId }, data: { status: 'FILLED' } });
        filled = true;
      }

      await insertInAppNotifications(
        tx,
        [
          {
            userId: job.employerId,
            templateKey: 'selection_offer_accepted',
            title: 'Proposition acceptée',
            message: `Un candidat a accepté la place pour « ${job.title} ».`,
            relatedType: 'participation',
            relatedId: participation.id,
            dedupeKey: `selection_offer_accepted:${offerId}`,
          },
        ],
        now,
      );
      return this.acceptedBody(participation.id, participation.status);
    });
    if (filled) await this.publicJobsCache.invalidate();
    return outcome;
  }

  /** Déclin : la proposition se termine et la place redevient proposable. */
  async decline(userId: string, offerId: string, idempotencyKey: string | undefined): Promise<Outcome> {
    const head = await this.ownedOffer(userId, offerId);
    return this.idempotent(userId, idempotencyKey, `decline:${offerId}`, head.jobId, async (tx) => {
      const now = await this.clock.now();
      const offer = await tx.selectionOffer.findUniqueOrThrow({
        where: { id: offerId },
        select: { status: true, expiresAt: true },
      });
      if (offer.status === 'DECLINED') {
        return { httpStatus: 200, body: this.declinedBody(offerId) };
      }
      if (offer.status === 'EXPIRED') {
        return { httpStatus: 409, body: { code: 'PROPOSAL_EXPIRED', message: PROPOSAL_EXPIRED_MESSAGE } };
      }
      if (offer.status !== 'PENDING') {
        fail(409, 'VALIDATION', 'Cette proposition n’est plus active.');
      }
      if (offer.expiresAt <= now) {
        await expireOfferInTx(tx, offerId, head.jobId, now);
        return { httpStatus: 409, body: { code: 'PROPOSAL_EXPIRED', message: PROPOSAL_EXPIRED_MESSAGE } };
      }
      await tx.selectionOffer.update({ where: { id: offerId }, data: { status: 'DECLINED' } });
      await tx.application.update({ where: { id: head.applicationId }, data: { status: 'DECLINED' } });
      return { httpStatus: 200, body: this.declinedBody(offerId) };
    });
  }

  /** Balayage des propositions échues, selon l’horloge applicative. */
  async runExpirations() {
    const now = await this.clock.now();
    const result = await sweepExpiredOffers(this.prisma.client, now);
    return { ...result, at: now.toISOString() };
  }

  // ---------------------------------------------------------------- outils

  private acceptedBody(participationId: string, participationStatus: string): Outcome {
    return {
      httpStatus: 200,
      body: {
        applicationStatus: 'ACCEPTED',
        applicationStatusLabel: labelFr('ACCEPTED'),
        participationId,
        participationStatus,
      },
    };
  }

  private declinedBody(offerId: string) {
    return {
      id: offerId,
      status: 'DECLINED',
      applicationStatus: 'DECLINED',
      applicationStatusLabel: labelFr('DECLINED'),
    };
  }

  /** Candidature d’une offre du recruteur connecté ; sinon 404 (pas de 403 : ne pas révéler l’identifiant). */
  private async ownedApplication(userId: string, applicationId: string) {
    const app = await this.prisma.client.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        jobId: true,
        workerId: true,
        job: { select: { employerId: true, title: true } },
      },
    });
    if (!app || app.job.employerId !== userId) {
      throw new HttpException(NOT_FOUND, 404);
    }
    return { id: app.id, jobId: app.jobId, workerId: app.workerId, jobTitle: app.job.title };
  }

  /** Proposition adressée au candidat connecté ; sinon 404. */
  private async ownedOffer(userId: string, offerId: string) {
    const offer = await this.prisma.client.selectionOffer.findUnique({
      where: { id: offerId },
      select: { id: true, application: { select: { id: true, workerId: true, jobId: true } } },
    });
    if (!offer || offer.application.workerId !== userId) {
      throw new HttpException(OFFER_NOT_FOUND, 404);
    }
    return { id: offer.id, applicationId: offer.application.id, jobId: offer.application.jobId };
  }

  /** Fige la version des conditions si l’offre n’en a pas encore (offres créées avant le versionnage). */
  private async freezeVersion(tx: Tx, jobId: string, userId: string): Promise<string> {
    const job = await tx.job.findUniqueOrThrow({ where: { id: jobId } });
    const last = await tx.jobVersion.findFirst({
      where: { jobId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const version = await tx.jobVersion.create({
      data: {
        jobId,
        versionNumber: (last?.versionNumber ?? 0) + 1,
        snapshot: jobSnapshot(job as unknown as Record<string, unknown>) as Prisma.InputJsonValue,
        createdBy: userId,
      },
      select: { id: true },
    });
    await tx.job.update({ where: { id: jobId }, data: { currentVersionId: version.id } });
    return version.id;
  }

  /**
   * Idempotence (api.md) : même clé + même requête → réponse enregistrée ; même clé + autre requête → 409.
   * La clé est écrite dans la même transaction que l’effet : un rejeu ne voit jamais un effet sans réponse.
   * Le verrou de l’offre est pris avant de relire la clé : deux requêtes parallèles avec la même clé
   * se sérialisent, et la seconde relit la réponse validée par la première au lieu de rejouer l’effet.
   */
  private async idempotent(
    userId: string,
    rawKey: string | undefined,
    requestHash: string,
    jobId: string,
    run: (tx: Tx) => Promise<Outcome>,
  ): Promise<Outcome> {
    const key = rawKey?.trim() ?? '';
    if (!key || key.length > 200) {
      fail(400, 'VALIDATION', 'Indiquez une clé d’idempotence.');
    }
    const replay = await this.storedOutcome(userId, key, requestHash);
    if (replay) return replay;
    try {
      return await this.prisma.client.$transaction(
        async (tx) => {
          await lockJobRow(tx, jobId);
          const already = await this.storedOutcome(userId, key, requestHash, tx);
          if (already) return already;
          const result = await run(tx);
          await tx.idempotencyKey.create({
            data: {
              userId,
              key,
              requestHash,
              responseCode: result.httpStatus,
              responseBody: result.body as Prisma.InputJsonValue,
            },
          });
          return result;
        },
        { timeout: 15_000, maxWait: 15_000 },
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        const again = await this.storedOutcome(userId, key, requestHash);
        if (again) return again;
        // Collision sur un index métier (une seule proposition PENDING par candidature).
        fail(409, 'VALIDATION', 'Une proposition est déjà en cours pour cette candidature.');
      }
      throw err;
    }
  }

  private async storedOutcome(
    userId: string,
    key: string,
    requestHash: string,
    db: Tx = this.prisma.client,
  ): Promise<Outcome | null> {
    const stored = await db.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!stored) return null;
    if (stored.requestHash !== requestHash) {
      fail(409, 'VALIDATION', 'Cette clé d’idempotence a déjà servi pour une autre demande.');
    }
    return {
      httpStatus: stored.responseCode,
      body: (stored.responseBody ?? {}) as Record<string, unknown>,
    };
  }
}
