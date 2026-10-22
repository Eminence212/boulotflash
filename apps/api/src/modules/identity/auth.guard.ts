import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtService } from './jwt.service';
import { TokenBlacklistService } from './token-blacklist.service';

export type AuthedRequest = Request & { userId?: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match?.[1]) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Bearer manquant.' },
        401,
      );
    }
    try {
      const claims = await this.jwt.verifyAccess(match[1].trim());
      if (await this.blacklist.isRevoked(claims.jti)) {
        throw new Error('revoked');
      }
      req.userId = claims.sub;
      return true;
    } catch {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Jeton d’accès invalide.' },
        401,
      );
    }
  }
}
