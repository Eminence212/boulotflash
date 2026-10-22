import {
  Body,
  Controller,
  HttpException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  parseCookies,
  setRefreshCookie,
} from './cookie';
import { JwtService } from './jwt.service';
import { OauthRateLimitService } from './oauth-rate-limit.service';
import { SessionService } from './session.service';
import { TokenBlacklistService } from './token-blacklist.service';

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0]!.trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function looksLikeDemoToken(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('demo:');
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessions: SessionService,
    private readonly rateLimit: OauthRateLimitService,
    private readonly jwt: JwtService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const cookies = parseCookies(req.headers.cookie);
    const raw = cookies[REFRESH_COOKIE];
    if (!raw) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Refresh manquant.' },
        401,
      );
    }
    const pair = await this.sessions.rotateRefresh(
      raw,
      req.headers['user-agent'],
    );
    setRefreshCookie(res, pair.refreshToken, pair.refreshMaxAgeSec);
    return { accessToken: pair.accessToken, expiresIn: pair.expiresIn };
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const cookies = parseCookies(req.headers.cookie);
    await this.sessions.revokeRefresh(cookies[REFRESH_COOKIE]);
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (match?.[1]) {
      try {
        const claims = await this.jwt.verifyAccess(match[1].trim());
        await this.blacklist.revokeAccess(
          claims.jti,
          this.jwt.getAccessTtlSeconds(),
        );
      } catch {
        // jeton déjà invalide
      }
    }
    clearRefreshCookie(res);
    return { ok: true };
  }

  @Post('dev-session')
  async devSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { email?: string },
  ): Promise<{ accessToken: string; expiresIn: number; userId: string }> {
    if (!isTruthy(process.env.ENABLE_TEST_HOOKS)) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Hook de test désactivé.' },
        404,
      );
    }
    const user = await this.sessions.createDevUser(body?.email);
    const pair = await this.sessions.issueSession(
      user.id,
      req.headers['user-agent'],
    );
    setRefreshCookie(res, pair.refreshToken, pair.refreshMaxAgeSec);
    return {
      accessToken: pair.accessToken,
      expiresIn: pair.expiresIn,
      userId: pair.userId,
    };
  }

  @Post('oauth/google')
  oauthGoogle(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ): Promise<never> {
    return this.handleOauthStub(req, body);
  }

  @Post('oauth/facebook')
  oauthFacebook(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ): Promise<never> {
    return this.handleOauthStub(req, body);
  }

  @Post('oauth/instagram')
  oauthInstagram(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ): Promise<never> {
    return this.handleOauthStub(req, body);
  }

  private async handleOauthStub(
    req: Request,
    body: Record<string, unknown>,
  ): Promise<never> {
    await this.rateLimit.assertAllowed(clientIp(req));

    const candidates = [
      body?.idToken,
      body?.accessToken,
      body?.token,
      body?.credential,
    ];
    if (candidates.some(looksLikeDemoToken)) {
      throw new HttpException(
        {
          code: 'UNAUTHORIZED',
          message: 'Jeton inventé ou demo: refusé (D34).',
        },
        401,
      );
    }

    throw new HttpException(
      {
        code: 'OAUTH_NOT_READY',
        message: 'Connexion OAuth disponible à l’étape 09.',
      },
      501,
    );
  }
}
