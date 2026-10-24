import type { PrismaClient } from '@prisma/client';
import { jobPlace } from './notification-text';
import { insertInAppNotifications } from './selection';

/**
 * Rappel de mission in-app (étape 19, D16, CDC §8.2). Les deux parties d’une participation CONFIRMED
 * reçoivent une ligne IN_APP dès que `start_at − reminder_hours_before` est atteint, avant le début.
 * Balayage rejouable : `dedupe_key = mission_reminder:{participationId}` garde une seule ligne par
 * personne. In-app 24 h/24 : pas d’heures calmes, pas de push, pas d’e-mail (D36).
 */
export const REMINDER_QUEUE = 'mission-reminders';
export const REMINDER_SWEEP = 'sweep-reminders';
export const REMINDER_SWEEP_EVERY_MS = 60_000;

/** « 3 h », « 2 h 40 », « 45 min » : délai restant, arrondi à la minute inférieure. */
export function startsInLabel(ms: number): string {
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest < 5 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
}

export async function sweepMissionReminders(
  prisma: PrismaClient,
  now: Date,
  limit = 500,
): Promise<{ scanned: number; created: number; hoursBefore: number }> {
  const settings = await prisma.platformSetting.findUnique({
    where: { id: 1 },
    select: { reminderHoursBefore: true },
  });
  const hoursBefore = settings?.reminderHoursBefore ?? 3;
  const horizon = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);
  const due = await prisma.participation.findMany({
    where: {
      status: 'CONFIRMED',
      contactRevokedAt: null,
      job: { startAt: { gt: now, lte: horizon } },
    },
    orderBy: { job: { startAt: 'asc' } },
    take: limit,
    select: {
      id: true,
      workerId: true,
      employerId: true,
      job: { select: { title: true, startAt: true, commune: { select: { name: true } } } },
    },
  });

  let created = 0;
  for (const p of due) {
    const place = jobPlace({ title: p.job.title, startAt: p.job.startAt, commune: p.job.commune.name });
    const left = startsInLabel(p.job.startAt.getTime() - now.getTime());
    const base = {
      templateKey: 'mission_reminder',
      title: 'Rappel de mission',
      relatedType: 'participation',
      relatedId: p.id,
      dedupeKey: `mission_reminder:${p.id}`,
    };
    created += await prisma.$transaction((tx) =>
      insertInAppNotifications(
        tx,
        [
          {
            ...base,
            userId: p.workerId,
            message: `${place}, commence dans ${left}. Ouvrez les coordonnées pour retrouver l’adresse exacte et joindre le recruteur.`,
          },
          {
            ...base,
            userId: p.employerId,
            message: `${place}, commence dans ${left}. Ouvrez les coordonnées pour joindre le candidat si besoin.`,
          },
        ],
        now,
      ),
    );
  }
  return { scanned: due.length, created, hoursBefore };
}
