import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  AdminAuthGuard,
  type AdminAuthedRequest,
} from './admin-auth.guard';

/** Session admin courante — pour le tableau de bord vide. */
@Controller('admin/me')
@UseGuards(AdminAuthGuard)
export class AdminMeController {
  @Get()
  me(@Req() req: AdminAuthedRequest) {
    return {
      id: req.adminUserId,
      scope: req.adminScope,
    };
  }
}
