import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { parseCookies } from '../cookie';
import { AdminAuthService } from './admin-auth.service';
import {
  ADMIN_CHALLENGE_COOKIE,
  ADMIN_REFRESH_COOKIE,
  clearAdminChallengeCookie,
  clearAdminRefreshCookie,
  setAdminChallengeCookie,
  setAdminRefreshCookie,
} from './admin-cookie';
import { AdminSessionService } from './admin-session.service';
import { AdminJwtService } from './admin-jwt.service';
import { TokenBlacklistService } from '../token-blacklist.service';

type LoginBody = { username?: string; password?: string };
type TotpBody = { code?: string };

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly sessions: AdminSessionService,
    private readonly jwt: AdminJwtService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ totpRequired: true }> {
    const username = body.username?.trim() ?? '';
    const password = body.password ?? '';
    if (!username || !password) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Identifiant et mot de passe requis.' },
        400,
      );
    }
    const result = await this.auth.login(username, password);
    setAdminChallengeCookie(res, result.challengeToken, result.challengeMaxAgeSec);
    clearAdminRefreshCookie(res);
    return { totpRequired: true };
  }

  @Post('totp')
  @HttpCode(200)
  async totp(
    @Body() body: TotpBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; expiresIn: number; scope: string }> {
    const code = body.code?.trim() ?? '';
    if (!code) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'Code TOTP requis.' },
        400,
      );
    }
    const cookies = parseCookies(req.headers.cookie);
    const challenge = cookies[ADMIN_CHALLENGE_COOKIE];
    const session = await this.auth.verifyTotp(challenge, code);
    clearAdminChallengeCookie(res);
    setAdminRefreshCookie(res, session.refreshToken, session.refreshMaxAgeSec);
    return {
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      scope: session.scope,
    };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookies = parseCookies(req.headers.cookie);
    await this.sessions.revokeRefresh(cookies[ADMIN_REFRESH_COOKIE]);
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (match?.[1]) {
      try {
        const claims = await this.jwt.verifyAdminAccess(match[1].trim());
        await this.blacklist.revokeAccess(
          claims.jti,
          this.jwt.getAccessTtlSeconds(),
        );
      } catch {
        // ignore
      }
    }
    clearAdminRefreshCookie(res);
    clearAdminChallengeCookie(res);
  }
}
