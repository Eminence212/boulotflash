import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 50;

type Row = {
  id: string;
  templateKey: string;
  title: string;
  message: string;
  relatedType: string | null;
  relatedId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/**
 * Centre de notifications in-app (étape 18). Seules les lignes IN_APP du compte sont lues.
 * L’écran à ouvrir est calculé à la lecture depuis l’objet lié, selon le rôle du destinataire.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, unreadOnly: boolean) {
    const where = { userId, channel: 'IN_APP' as const };
    const [rows, unreadCount] = await Promise.all([
      this.prisma.client.notification.findMany({
        where: { ...where, ...(unreadOnly ? { readAt: null } : {}) },
        orderBy: { createdAt: 'desc' },
        take: PAGE_SIZE,
        select: {
          id: true,
          templateKey: true,
          title: true,
          message: true,
          relatedType: true,
          relatedId: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.client.notification.count({ where: { ...where, readAt: null } }),
    ]);
    const hrefs = await this.resolveHrefs(userId, rows);
    return {
      unreadCount,
      items: rows.map((row) => ({
        id: row.id,
        type: row.templateKey,
        title: row.title,
        message: row.message,
        href: hrefs.get(row.id) ?? null,
        read: !!row.readAt,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  /** Idempotent : une ligne déjà lue garde sa première date de lecture. */
  async markRead(userId: string, id: string) {
    if (!UUID_RE.test(id)) throw this.notFound();
    const row = await this.prisma.client.notification.findFirst({
      where: { id, userId, channel: 'IN_APP' },
      select: { id: true, readAt: true },
    });
    if (!row) throw this.notFound();
    const readAt = row.readAt ?? new Date();
    if (!row.readAt) {
      await this.prisma.client.notification.update({
        where: { id },
        data: { readAt, status: 'READ' },
      });
    }
    return { id, read: true, readAt: readAt.toISOString() };
  }

  private notFound() {
    return new HttpException({ code: 'NOT_FOUND', message: 'Notification introuvable.' }, 404);
  }

  /** Offre de rattachement de chaque ligne, puis la page utile au destinataire. */
  private async resolveHrefs(userId: string, rows: Row[]): Promise<Map<string, string>> {
    const ids = (type: string) => rows.filter((r) => r.relatedType === type && r.relatedId).map((r) => r.relatedId!);
    const db = this.prisma.client;
    const [jobs, applications, offers, participations] = await Promise.all([
      db.job.findMany({ where: { id: { in: ids('job') } }, select: { id: true, employerId: true } }),
      db.application.findMany({
        where: { id: { in: ids('application') } },
        select: { id: true, job: { select: { id: true, employerId: true } } },
      }),
      db.selectionOffer.findMany({
        where: { id: { in: ids('selection_offer') } },
        select: { id: true, application: { select: { job: { select: { id: true, employerId: true } } } } },
      }),
      db.participation.findMany({
        where: { id: { in: ids('participation') } },
        select: { id: true, status: true, jobId: true, employerId: true },
      }),
    ]);
    const jobOf = new Map<string, { id: string; employerId: string }>();
    for (const j of jobs) jobOf.set(j.id, j);
    for (const a of applications) jobOf.set(a.id, a.job);
    for (const o of offers) jobOf.set(o.id, o.application.job);
    for (const p of participations) jobOf.set(p.id, { id: p.jobId, employerId: p.employerId });
    const confirmed = new Set(participations.filter((p) => p.status === 'CONFIRMED').map((p) => p.id));

    const hrefs = new Map<string, string>();
    for (const row of rows) {
      if (!row.relatedId) continue;
      const job = jobOf.get(row.relatedId);
      if (!job) continue;
      if (row.relatedType === 'participation' && confirmed.has(row.relatedId)) {
        hrefs.set(row.id, `/participations/${row.relatedId}`);
      } else if (job.employerId === userId) {
        hrefs.set(row.id, row.templateKey === 'job_suspended' ? '/missions' : `/missions/${job.id}/candidatures`);
      } else {
        hrefs.set(row.id, `/missions/${job.id}`);
      }
    }
    return hrefs;
  }
}
