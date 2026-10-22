import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminScopeClaim } from './admin-jwt.service';
import { ADMIN_SCOPES_KEY } from './admin-scope.decorator';
import type { AdminAuthedRequest } from './admin-auth.guard';

@Injectable()
export class AdminScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<AdminScopeClaim[]>(ADMIN_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const req = context.switchToHttp().getRequest<AdminAuthedRequest>();
    const scope = req.adminScope;
    if (!scope) {
      throw new HttpException(
        { code: 'FORBIDDEN', message: 'Scope admin manquant.' },
        403,
      );
    }

    // SUPER passe partout.
    if (scope === 'SUPER') return true;

    if (required.length === 0) return true;

    if (!required.includes(scope)) {
      throw new HttpException(
        { code: 'FORBIDDEN', message: 'Droits insuffisants pour cette action.' },
        403,
      );
    }
    return true;
  }
}
