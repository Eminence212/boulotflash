import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from './admin-auth.guard';
import { RequireAdminScopes } from './admin-scope.decorator';
import { AdminScopeGuard } from './admin-scope.guard';

@Controller('admin/payments')
@UseGuards(AdminAuthGuard, AdminScopeGuard)
export class AdminFinanceController {
  /** Stub étape 10 — liste vide pour la recette finance. */
  @Get()
  @RequireAdminScopes('FINANCE', 'SUPER')
  list(): { items: [] } {
    return { items: [] };
  }
}
