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
import { AdminAuthService } from './admin-auth.service';
import {
  AdminAuthGuard,
  type AdminAuthedRequest,
} from './admin-auth.guard';
import { RequireAdminScopes } from './admin-scope.decorator';
import { AdminScopeGuard } from './admin-scope.guard';
import type { AdminScopeClaim } from './admin-jwt.service';

type CreateBody = {
  username?: string;
  password?: string;
  adminScope?: AdminScopeClaim;
};

@Controller('admin/users')
@UseGuards(AdminAuthGuard, AdminScopeGuard)
export class AdminUsersController {
  constructor(private readonly auth: AdminAuthService) {}

  @Get(':id')
  @RequireAdminScopes('SUPPORT', 'MODERATOR', 'FINANCE', 'SUPER')
  async getOne(@Param('id') id: string) {
    return this.auth.getUserForSupport(id);
  }

  @Post()
  @HttpCode(201)
  @RequireAdminScopes('SUPER')
  async create(@Req() req: AdminAuthedRequest, @Body() body: CreateBody) {
    if (!req.adminUserId) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Session admin requise.' },
        401,
      );
    }
    if (!body.username || !body.password || !body.adminScope) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: 'username, password et adminScope sont requis.',
        },
        400,
      );
    }
    return this.auth.createInternalUser(req.adminUserId, {
      username: body.username,
      password: body.password,
      adminScope: body.adminScope,
    });
  }

  @Post(':id/close')
  @RequireAdminScopes('SUPER')
  async close(@Req() req: AdminAuthedRequest, @Param('id') id: string) {
    if (!req.adminUserId) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Session admin requise.' },
        401,
      );
    }
    return this.auth.closeUser(req.adminUserId, id);
  }
}
