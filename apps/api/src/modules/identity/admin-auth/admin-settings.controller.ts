import { Body, Controller, Get, HttpException, Patch, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuthGuard, type AdminAuthedRequest } from './admin-auth.guard';
import { RequireAdminScopes } from './admin-scope.decorator';
import { AdminScopeGuard } from './admin-scope.guard';

/** Bornes du délai de rappel : au moins 1 h avant le début, au plus 24 h (hypothèse D16 : 3 h). */
export const REMINDER_HOURS_MIN = 1;
export const REMINDER_HOURS_MAX = 24;

/**
 * Réglages de la plateforme modifiables sans redéploiement (PLAN §2, `platform_settings`).
 * Super-admin seulement ; chaque changement est journalisé avec l’ancienne et la nouvelle valeur.
 */
@Controller('admin/settings')
@UseGuards(AdminAuthGuard, AdminScopeGuard)
export class AdminSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequireAdminScopes('SUPER')
  async get() {
    const row = await this.prisma.client.platformSetting.findUnique({
      where: { id: 1 },
      select: { reminderHoursBefore: true, updatedAt: true },
    });
    return {
      reminderHoursBefore: row?.reminderHoursBefore ?? 3,
      reminderHoursMin: REMINDER_HOURS_MIN,
      reminderHoursMax: REMINDER_HOURS_MAX,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  }

  /** `{ "hours": 3 }` — délai du rappel de mission in-app (D16), lu à chaque balayage du worker. */
  @Patch('reminder-hours')
  @RequireAdminScopes('SUPER')
  async setReminderHours(@Req() req: AdminAuthedRequest, @Body() body: { hours?: unknown }) {
    if (!req.adminUserId) {
      throw new HttpException({ code: 'UNAUTHORIZED', message: 'Session admin requise.' }, 401);
    }
    const hours = body?.hours;
    if (typeof hours !== 'number' || !Number.isInteger(hours) || hours < REMINDER_HOURS_MIN || hours > REMINDER_HOURS_MAX) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: `Indiquez un nombre entier d’heures entre ${REMINDER_HOURS_MIN} et ${REMINDER_HOURS_MAX}.`,
        },
        400,
      );
    }
    const actorId = req.adminUserId;
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const before = await tx.platformSetting.findUnique({ where: { id: 1 }, select: { reminderHoursBefore: true } });
      const row = await tx.platformSetting.upsert({
        where: { id: 1 },
        create: { id: 1, reminderHoursBefore: hours, updatedBy: actorId },
        update: { reminderHoursBefore: hours, updatedBy: actorId },
        select: { reminderHoursBefore: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'SETTINGS_REMINDER_HOURS',
          entityType: 'platform_settings',
          entityId: null,
          metadata: { previous: before?.reminderHoursBefore ?? null, next: hours },
        },
      });
      return row;
    });
    return { reminderHoursBefore: updated.reminderHoursBefore, updatedAt: updated.updatedAt.toISOString() };
  }
}
