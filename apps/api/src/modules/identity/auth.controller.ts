import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccountResolverService } from './account-resolver.service';
import { AuthGuard, type AuthedRequest } from './auth.guard';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  parseCookies,
  setRefreshCookie,
} from './cookie';
import { JwtService } from './jwt.service';
import { OauthRateLimitService } from './oauth-rate-limit.service';
import { OauthTokenVerifierService } from './oauth-token-verifier.service';
import type { OauthCredentialInput, OauthProvider } from './oauth-types';
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

type OauthBody = OauthCredentialInput & {
  acceptTerms?: boolean;
  acceptPrivacy?: boolean;
  ageConfirmed?: boolean;
};

type LinkBody = OauthCredentialInput & {
  provider?: OauthProvider;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessions: SessionService,
    private readonly rateLimit: OauthRateLimitService,
    private readonly jwt: JwtService,
    private readonly blacklist: TokenBlacklistService,
    private readonly verifier: OauthTokenVerifierService,
    private readonly accounts: AccountResolverService,
  ) {}

  @Get('oauth/config')
  oauthConfig() {
    return this.verifier.getPublicConfig();
  }

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
    @Body()
    body: {
      email?: string;
      acceptTerms?: boolean;
      acceptPrivacy?: boolean;
      ageConfirmed?: boolean;
    },
  ): Promise<{ accessToken: string; expiresIn: number; userId: string }> {
    if (!isTruthy(process.env.ENABLE_TEST_HOOKS)) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Hook de test désactivé.' },
        404,
      );
    }
    this.assertLegalAcceptance(body);
    const user = await this.sessions.createDevUser(body?.email);
    await this.sessions.recordLegalAcceptance(user.id);
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
    @Res({ passthrough: true }) res: Response,
    @Body() body: OauthBody,
  ) {
    return this.handleOauthLogin('google', req, res, body);
  }

  @Post('oauth/facebook')
  oauthFacebook(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: OauthBody,
  ) {
    return this.handleOauthLogin('facebook', req, res, body);
  }

  @Post('oauth/instagram')
  oauthInstagram(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: OauthBody,
  ) {
    return this.handleOauthLogin('instagram', req, res, body);
  }

  @Post('oauth/link')
  @UseGuards(AuthGuard)
  async oauthLink(
    @Req() req: AuthedRequest,
    @Body() body: LinkBody,
  ): Promise<{ ok: true; provider: OauthProvider }> {
    await this.rateLimit.assertAllowed(clientIp(req));
    const provider = body?.provider;
    if (
      provider !== 'google' &&
      provider !== 'facebook' &&
      provider !== 'instagram'
    ) {
      throw new HttpException(
        { code: 'VALIDATION', message: 'provider requis (google|facebook|instagram).' },
        400,
      );
    }
    this.assertNoDemo(body);
    const profile = await this.verifier.verify(provider, body ?? {});
    await this.accounts.linkProvider(req.userId!, profile);
    return { ok: true, provider };
  }

  private async handleOauthLogin(
    provider: OauthProvider,
    req: Request,
    res: Response,
    body: OauthBody,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
    userId: string;
    needsProfileCompletion: boolean;
  }> {
    await this.rateLimit.assertAllowed(clientIp(req));
    this.assertLegalAcceptance(body);
    this.assertNoDemo(body);

    const profile = await this.verifier.verify(provider, body ?? {});
    const { userId } = await this.accounts.resolveLogin(profile);
    await this.sessions.recordLegalAcceptance(userId);
    const pair = await this.sessions.issueSession(
      userId,
      req.headers['user-agent'],
    );
    setRefreshCookie(res, pair.refreshToken, pair.refreshMaxAgeSec);
    const me = await this.sessions.getUserForMe(userId);
    return {
      accessToken: pair.accessToken,
      expiresIn: pair.expiresIn,
      userId: pair.userId,
      needsProfileCompletion: me.needsProfileCompletion,
    };
  }

  private assertLegalAcceptance(body: {
    acceptTerms?: boolean;
    acceptPrivacy?: boolean;
    ageConfirmed?: boolean;
  }): void {
    if (
      body?.acceptTerms !== true ||
      body?.acceptPrivacy !== true ||
      body?.ageConfirmed !== true
    ) {
      throw new HttpException(
        {
          code: 'TERMS_REQUIRED',
          message:
            'Confirmez la majorité (18 ans) et acceptez les Conditions d’utilisation et la Politique de confidentialité.',
        },
        400,
      );
    }
  }

  private assertNoDemo(body: OauthCredentialInput): void {
    const candidates = [
      body?.idToken,
      body?.accessToken,
      body?.code,
      (body as { token?: string; credential?: string })?.token,
      (body as { credential?: string })?.credential,
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
  }
}
