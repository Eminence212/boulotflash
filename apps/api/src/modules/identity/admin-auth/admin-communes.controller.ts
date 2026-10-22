import {
  Body,
  Controller,
  HttpException,
  Param,
  Patch,
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

@Controller('admin/communes')
@UseGuards(AdminAuthGuard, AdminScopeGuard)
export class AdminCommunesController {
  constructor(private readonly auth: AdminAuthService) {}

  @Patch(':id')
  @RequireAdminScopes('SUPER')
  async patch(
    @Req() req: AdminAuthedRequest,
    @Param('id') id: string,
    @Body() body: { isActive?: boolean },
  ) {
    if (!req.adminUserId) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Session admin requise.' },
        401,
      );
    }
    if (typeof body.isActive !== 'boolean') {
      throw new HttpException(
        { code: 'VALIDATION', message: 'isActive boolean requis.' },
        400,
      );
    }
    return this.auth.patchCommune(req.adminUserId, id, body.isActive);
  }
}
