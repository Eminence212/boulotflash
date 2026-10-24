import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { insertInAppNotifications } from '@boulotflash/database';
import { PrismaService } from '../prisma/prisma.service';
import { PublicJobsCacheService } from '../redis-cache/public-jobs-cache.service';
import { ClockService } from './clock.service';
import { IdempotencyService, type Outcome } from './idempotency.service';

type Db = PrismaService['client'] | Prisma.TransactionClient;

const NOT_FOUND = { code: 'NOT_FOUND', message: 'Coordonnées indisponibles.' };

const CONTACT_SELECT = {
  id: true,
  status: true,
  contactRevokedAt: true,
  workerId: true,
  employerId: true,
  worker: {
    select: { phone: true, displayName: true, workerProfile: { select: { displayName: true } } },
  },
  employer: {
    select: { phone: true, displayName: true, employerProfile: { select: { displayName: true } } },
  },
  job: {
    select: {
      id: true,
      title: true,
      startAt: true,
      durationHours: true,
      amount: true,
      currency: true,
      payUnit: true,
      addressPrivate: true,
      privateLatitude: true,
      privateLongitude: true,
      commune: { select: { name: true } },
    },
  },
} satisfies Prisma.ParticipationSelect;

type ContactRow = Prisma.ParticipationGetPayload<{ select: typeof CONTACT_SELECT }>;

/**
 * Coordonnées d’une participation (étape 17).
 * Lisibles seulement par le candidat et le recruteur de la participation, tant qu’elle est
 * CONFIRMED et non révoquée. Jamais journalisées : seul l’identifiant de participation apparaît.
 */
@Injectable()
export class ParticipationService {
  private readonly logger = new Logger(ParticipationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly idempotency: IdempotencyService,
    private readonly publicJobsCache: PublicJobsCacheService,
  ) {}

  /** Contact pour une partie autorisée, ou null (tiers, annulée, révoquée, inconnue). */
  async contactForParty(userId: string, participationId: string, db: Db = this.prisma.client) {
    const row = await db.participation.findUnique({
      where: { id: participationId },
      select: CONTACT_SELECT,
    });
    if (!row) return null;
    const isWorker = row.workerId === userId;
    const isEmployer = row.employerId === userId;
    if (!isWorker && !isEmployer) return null;
    if (row.status !== 'CONFIRMED' || row.contactRevokedAt) return null;
    return this.toContact(row, isEmployer ? 'EMPLOYER' : 'WORKER');
  }

  async getContact(userId: string, participationId: string) {
    const contact = await this.contactForParty(userId, participationId);
    // Même réponse pour un tiers, une participation annulée ou inconnue : rien ne se déduit.
    if (!contact) throw new HttpException(NOT_FOUND, 404);
    return contact;
  }

  /** Super-admin : lecture journalisée (contact_access_logs + audit OPEN_CONTACT sans adresse ni numéro). */
  async adminContact(adminUserId: string, participationId: string) {
    const row = await this.prisma.client.participation.findUnique({
      where: { id: participationId },
      select: CONTACT_SELECT,
    });
    if (!row) throw new HttpException({ code: 'NOT_FOUND', message: 'Participation introuvable.' }, 404);
    await this.prisma.client.$transaction([
      this.prisma.client.contactAccessLog.create({
        data: { actorId: adminUserId, participationId },
      }),
      this.prisma.client.auditLog.create({
        data: {
          actorId: adminUserId,
          action: 'OPEN_CONTACT',
          entityType: 'participation',
          entityId: participationId,
          metadata: { participationId },
        },
      }),
    ]);
    this.logger.log(`OPEN_CONTACT participation=${participationId}`);
    return {
      ...this.toContact(row, 'EMPLOYER'),
      participationStatus: row.status,
      contactRevokedAt: row.contactRevokedAt?.toISOString() ?? null,
    };
  }

  /**
   * Déclaration d’une partie. Étape 17 : seule l’annulation est ouverte (l’étape 20 ajoutera
   * réalisation et absence sur la même route). L’annulation révoque l’accès aux coordonnées tout de
   * suite, libère la place (D20) et prévient les deux parties dans l’application.
   */
  async declare(
    userId: string,
    participationId: string,
    body: { outcome?: unknown },
    idempotencyKey: string | undefined,
  ): Promise<Outcome> {
    if (body?.outcome !== 'CANCELLED') {
      if (body?.outcome === 'COMPLETED' || body?.outcome === 'NO_SHOW') {
        throw new HttpException(
          { code: 'VALIDATION', message: 'Cette déclaration sera disponible après la mission.' },
          400,
        );
      }
      throw new HttpException({ code: 'VALIDATION', message: 'Déclaration inconnue.' }, 400);
    }
    const head = await this.prisma.client.participation.findUnique({
      where: { id: participationId },
      select: { jobId: true, workerId: true, employerId: true },
    });
    if (!head || (head.workerId !== userId && head.employerId !== userId)) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Participation introuvable.' }, 404);
    }
    const asEmployer = head.employerId === userId;
    let reopened = false;

    const outcome = await this.idempotency.run(
      userId,
      idempotencyKey,
      `declare:${participationId}:CANCELLED`,
      head.jobId,
      async (tx) => {
        const now = await this.clock.now();
        const row = await tx.participation.findUniqueOrThrow({
          where: { id: participationId },
          select: { status: true, job: { select: { id: true, title: true, status: true, applyDeadline: true } } },
        });
        if (row.status === 'CANCELLED') return this.cancelledBody(participationId);
        if (row.status !== 'CONFIRMED') {
          throw new HttpException(
            { code: 'VALIDATION', message: 'Cette participation ne peut plus être annulée.' },
            409,
          );
        }
        await tx.participation.update({
          where: { id: participationId },
          data: {
            status: 'CANCELLED',
            cancelledAt: now,
            contactRevokedAt: now,
            ...(asEmployer
              ? { employerOutcome: 'CANCELLED', employerDeclaredAt: now }
              : { workerOutcome: 'CANCELLED', workerDeclaredAt: now }),
          },
        });
        // D20 : la participation annulée ne compte plus ; une offre pourvue redevient publiée
        // si la date limite de candidature n’est pas passée.
        if (row.job.status === 'FILLED' && row.job.applyDeadline > now) {
          await tx.job.update({ where: { id: row.job.id }, data: { status: 'PUBLISHED' } });
          reopened = true;
        }
        const by = asEmployer ? 'Le recruteur' : 'Le candidat';
        await insertInAppNotifications(
          tx,
          [head.workerId, head.employerId].map((recipient) => ({
            userId: recipient,
            templateKey: 'participation_cancelled',
            title: 'Mission annulée',
            message:
              recipient === userId
                ? `Vous avez annulé votre participation à « ${row.job.title} ». Les coordonnées ne sont plus accessibles.`
                : `${by} a annulé la participation à « ${row.job.title} ». Les coordonnées ne sont plus accessibles.`,
            relatedType: 'participation',
            relatedId: participationId,
            dedupeKey: `participation_cancelled:${participationId}`,
          })),
          now,
        );
        return this.cancelledBody(participationId);
      },
    );
    if (reopened) await this.publicJobsCache.invalidate();
    return outcome;
  }

  private cancelledBody(participationId: string): Outcome {
    return {
      httpStatus: 200,
      body: { participationId, participationStatus: 'CANCELLED', contactRevoked: true },
    };
  }

  /**
   * D15 : le numéro révélé du recruteur est son `users.phone`. Le `mission_phone` de l’offre n’est pas
   * utilisé : aucune validation support de ce numéro n’existe encore.
   */
  private toContact(row: ContactRow, viewer: 'WORKER' | 'EMPLOYER') {
    const employerName =
      row.employer.employerProfile?.displayName ?? row.employer.displayName ?? 'Recruteur';
    const workerName = row.worker.workerProfile?.displayName ?? row.worker.displayName ?? 'Candidat';
    return {
      participationId: row.id,
      viewer,
      missionPhone: row.employer.phone,
      ...(viewer === 'EMPLOYER' ? { workerPhone: row.worker.phone } : {}),
      counterpart:
        viewer === 'EMPLOYER'
          ? { role: 'WORKER', displayName: workerName, phone: row.worker.phone }
          : { role: 'EMPLOYER', displayName: employerName, phone: row.employer.phone },
      addressPrivate: row.job.addressPrivate,
      privateLatitude: row.job.privateLatitude,
      privateLongitude: row.job.privateLongitude,
      job: {
        id: row.job.id,
        title: row.job.title,
        startAt: row.job.startAt.toISOString(),
        durationHours: row.job.durationHours,
        amount: row.job.amount,
        currency: row.job.currency,
        payUnit: row.job.payUnit,
        commune: row.job.commune.name,
      },
    };
  }
}
