import {
  Body,
  Controller,
  HttpException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import {
  AdminAuthGuard,
  type AdminAuthedRequest,
} from './admin-auth.guard';
import { RequireAdminScopes } from './admin-scope.decorator';
import { AdminScopeGuard } from './admin-scope.guard';

@Controller('admin/jobs')
@UseGuards(AdminAuthGuard, AdminScopeGuard)
export class AdminJobsController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post(':id/suspend')
  @RequireAdminScopes('MODERATOR', 'SUPER')
  async suspend(
    @Req() req: AdminAuthedRequest,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    if (!req.adminUserId) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Session admin requise.' },
        401,
      );
    }
    return this.auth.suspendJob(req.adminUserId, id, body.reason ?? '');
  }
}
