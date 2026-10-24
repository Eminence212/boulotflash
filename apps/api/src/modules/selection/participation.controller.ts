import { Body, Controller, Get, Header, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard, type AuthedRequest } from '../identity/auth.guard';
import {
  AdminAuthGuard,
  type AdminAuthedRequest,
} from '../identity/admin-auth/admin-auth.guard';
import { RequireAdminScopes } from '../identity/admin-auth/admin-scope.decorator';
import { AdminScopeGuard } from '../identity/admin-auth/admin-scope.guard';
import { ParticipationService } from './participation.service';

/** Coordonnées et déclarations des parties d’une participation (étape 17). */
@Controller('participations')
@UseGuards(AuthGuard)
export class ParticipationController {
  constructor(private readonly participations: ParticipationService) {}

  /** 200 pour les deux parties tant que la participation est confirmée ; 404 pour tout autre cas. */
  @Get(':id/contact')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  contact(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.participations.getContact(req.userId!, id);
  }

  @Post(':id/declarations')
  async declare(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() body: { outcome?: unknown },
  ) {
    const header = req.headers['idempotency-key'];
    const key = Array.isArray(header) ? header[0] : header;
    const result = await this.participations.declare(req.userId!, id, body ?? {}, key);
    res.status(result.httpStatus);
    return result.body;
  }
}

/** Super-admin seulement ; support, modération et finance reçoivent 403. Lecture journalisée. */
@Controller('admin/participations')
@UseGuards(AdminAuthGuard, AdminScopeGuard)
export class AdminParticipationController {
  constructor(private readonly participations: ParticipationService) {}

  @Get(':id/contact')
  @RequireAdminScopes('SUPER')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  contact(@Req() req: AdminAuthedRequest, @Param('id') id: string) {
    return this.participations.adminContact(req.adminUserId!, id);
  }
}
