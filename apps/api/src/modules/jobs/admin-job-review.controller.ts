import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AdminAuthGuard,
  type AdminAuthedRequest,
} from '../identity/admin-auth/admin-auth.guard';
import { RequireAdminScopes } from '../identity/admin-auth/admin-scope.decorator';
import { AdminScopeGuard } from '../identity/admin-auth/admin-scope.guard';
import { JobsService } from './jobs.service';

@Controller('admin/jobs')
@UseGuards(AdminAuthGuard, AdminScopeGuard)
export class AdminJobReviewController {
  constructor(private readonly jobs: JobsService) {}

  @Get('review-queue')
  @RequireAdminScopes('MODERATOR', 'SUPER')
  queue() {
    return this.jobs.reviewQueue();
  }

  @Post(':id/approve')
  @HttpCode(200)
  @RequireAdminScopes('MODERATOR', 'SUPER')
  approve(@Req() req: AdminAuthedRequest, @Param('id') id: string) {
    if (!req.adminUserId) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Session admin requise.' },
        401,
      );
    }
    return this.jobs.approve(req.adminUserId, id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @RequireAdminScopes('MODERATOR', 'SUPER')
  reject(
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
    return this.jobs.reject(req.adminUserId, id, body?.reason ?? '');
  }
}
