import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { TokenBlacklistService } from '../token-blacklist.service';
import {
  AdminJwtService,
  type AdminScopeClaim,
} from './admin-jwt.service';

export type AdminAuthedRequest = Request & {
  adminUserId?: string;
  adminScope?: AdminScopeClaim;
};

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: AdminJwtService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AdminAuthedRequest>();
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match?.[1]) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Bearer admin manquant.' },
        401,
      );
    }
    try {
      const claims = await this.jwt.verifyAdminAccess(match[1].trim());
      if (await this.blacklist.isRevoked(claims.jti)) {
        throw new Error('revoked');
      }
      req.adminUserId = claims.sub;
      req.adminScope = claims.scope;
      return true;
    } catch {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Jeton admin invalide.' },
        401,
      );
    }
  }
}
