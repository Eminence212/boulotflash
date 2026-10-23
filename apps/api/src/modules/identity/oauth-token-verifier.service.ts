import { createRemoteJWKSet, jwtVerify } from 'jose';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import {
  type OauthCredentialInput,
  type OauthProvider,
  type VerifiedOauthProfile,
} from './oauth-types';
import {
  googleProfilePhotoUrl,
  pickGooglePeoplePhoto,
  readProviderPicture,
} from './oauth-picture';
import { normalizePilotPhone } from './phone';

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
);

@Injectable()
export class OauthTokenVerifierService {
  private readonly logger = new Logger(OauthTokenVerifierService.name);

  async verify(
    provider: OauthProvider,
    input: OauthCredentialInput,
  ): Promise<VerifiedOauthProfile> {
    switch (provider) {
      case 'google':
        return this.verifyGoogle(input);
      case 'facebook':
        return this.verifyFacebook(input);
      case 'github':
        return this.verifyGitHub(input);
      default:
        throw new HttpException(
          { code: 'VALIDATION', message: 'Provider inconnu.' },
          400,
        );
    }
  }

  getPublicConfig() {
    return {
      google: {
        clientId: required('GOOGLE_CLIENT_ID'),
        redirectUri: required('GOOGLE_REDIRECT_URI'),
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        scopes: 'openid email profile',
      },
      facebook: {
        clientId: required('META_APP_ID'),
        redirectUri: required('FACEBOOK_REDIRECT_URI'),
        authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
        scopes: 'public_profile,email',
      },
      github: {
        clientId: required('GITHUB_CLIENT_ID'),
        redirectUri: required('GITHUB_REDIRECT_URI'),
        authUrl: 'https://github.com/login/oauth/authorize',
        scopes: 'read:user user:email',
      },
    };
  }

  private async verifyGoogle(
    input: OauthCredentialInput,
  ): Promise<VerifiedOauthProfile> {
    if (input.idToken?.trim()) {
      return this.verifyGoogleIdToken(input.idToken.trim());
    }
    if (input.code?.trim()) {
      return this.verifyGoogleCode(
        input.code.trim(),
        input.codeVerifier?.trim(),
      );
    }
    throw unauthorized('Code ou idToken Google requis.');
  }

  private async verifyGoogleIdToken(
    idToken: string,
  ): Promise<VerifiedOauthProfile> {
    const clientId = required('GOOGLE_CLIENT_ID');
    let payload: Record<string, unknown>;
    try {
      const verified = await jwtVerify(idToken, GOOGLE_JWKS, {
        audience: clientId,
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
      });
      payload = verified.payload as Record<string, unknown>;
    } catch (err) {
      this.logger.warn(`Google id_token invalide: ${String(err)}`);
      throw unauthorized('Jeton Google invalide.');
    }
    return this.mapGoogleClaims(payload);
  }

  private async verifyGoogleCode(
    code: string,
    codeVerifier: string | undefined,
  ): Promise<VerifiedOauthProfile> {
    const body = new URLSearchParams({
      code,
      client_id: required('GOOGLE_CLIENT_ID'),
      client_secret: required('GOOGLE_CLIENT_SECRET'),
      redirect_uri: required('GOOGLE_REDIRECT_URI'),
      grant_type: 'authorization_code',
    });
    if (codeVerifier) body.set('code_verifier', codeVerifier);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!tokenRes.ok) {
      this.logger.warn(`Google token exchange HTTP ${tokenRes.status}`);
      throw unauthorized('Échange code Google refusé.');
    }

    const accessToken =
      typeof tokenJson.access_token === 'string' ? tokenJson.access_token : null;
    const idToken = tokenJson.id_token;

    if (typeof idToken === 'string' && idToken.length > 0) {
      const profile = await this.verifyGoogleIdToken(idToken);
      if (!accessToken) return profile;
      const avatarUrl = await this.googleAvatar(accessToken, profile.avatarUrl);
      return { ...profile, avatarUrl };
    }

    if (!accessToken) {
      throw unauthorized('Réponse Google sans jeton utilisable.');
    }
    const info = await this.googleUserInfo(accessToken);
    if (!info) throw unauthorized('Userinfo Google inaccessible.');
    return this.mapGoogleClaims(info);
  }

  /**
   * Le `picture` du id_token est souvent absent ou limité à une miniature.
   * People API, puis userinfo, puis cette miniature.
   */
  private async googleAvatar(
    accessToken: string,
    fromIdToken: string | null,
  ): Promise<string | null> {
    const fromPeople = await this.googlePeoplePhoto(accessToken);
    if (fromPeople) return fromPeople;
    const info = await this.googleUserInfo(accessToken);
    const fromUserInfo = googleProfilePhotoUrl(
      info ? readProviderPicture(info.picture) : null,
    );
    if (fromUserInfo) return fromUserInfo;
    return googleProfilePhotoUrl(fromIdToken);
  }

  private async googlePeoplePhoto(accessToken: string): Promise<string | null> {
    const res = await fetch(
      'https://people.googleapis.com/v1/people/me?personFields=photos',
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      this.logger.warn(`Google People photos HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json().catch(() => ({}))) as { photos?: unknown };
    return pickGooglePeoplePhoto(body.photos);
  }

  private async googleUserInfo(
    accessToken: string,
  ): Promise<Record<string, unknown> | null> {
    const infoRes = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    const info = (await infoRes.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!infoRes.ok) {
      this.logger.warn(`Google userinfo HTTP ${infoRes.status}`);
      return null;
    }
    return info;
  }

  private mapGoogleClaims(
    claims: Record<string, unknown>,
  ): VerifiedOauthProfile {
    const sub = asString(claims.sub);
    if (!sub) throw unauthorized('Profil Google sans sub.');

    const email = asString(claims.email)?.toLowerCase() ?? null;
    const emailVerified =
      claims.email_verified === true || claims.email_verified === 'true';

    const policy = (process.env.GOOGLE_EMAIL_POLICY ?? 'verified_google')
      .trim()
      .toLowerCase();
    if (policy === 'verified_google') {
      if (!email || !emailVerified) {
        throw new HttpException(
          {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'E-mail Google non vérifié — connexion refusée.',
          },
          409,
        );
      }
    }

    return {
      provider: 'google',
      providerUserId: sub,
      email,
      emailVerified,
      displayName: asString(claims.name) ?? null,
      avatarUrl: googleProfilePhotoUrl(readProviderPicture(claims.picture)),
      phoneE164: null,
    };
  }

  private async verifyFacebook(
    input: OauthCredentialInput,
  ): Promise<VerifiedOauthProfile> {
    let accessToken = input.accessToken?.trim();
    if (!accessToken && input.code?.trim()) {
      accessToken = await this.exchangeMetaCode(
        input.code.trim(),
        required('FACEBOOK_REDIRECT_URI'),
        input.codeVerifier?.trim(),
      );
    }
    if (!accessToken) {
      throw unauthorized('Code ou accessToken Facebook requis.');
    }

    const url = new URL('https://graph.facebook.com/v21.0/me');
    url.searchParams.set('fields', 'id,name,email,picture.type(large)');
    url.searchParams.set('access_token', accessToken);
    const res = await fetch(url);
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || !asString(data.id)) {
      this.logger.warn(`Facebook /me HTTP ${res.status}`);
      throw unauthorized('Profil Facebook inaccessible.');
    }

    return {
      provider: 'facebook',
      providerUserId: asString(data.id)!,
      email: asString(data.email)?.toLowerCase() ?? null,
      emailVerified: !!asString(data.email),
      displayName: asString(data.name) ?? null,
      avatarUrl: readProviderPicture(data.picture),
      phoneE164: normalizePilotPhone(asString(data.mobile_phone)),
    };
  }

  private async verifyGitHub(
    input: OauthCredentialInput,
  ): Promise<VerifiedOauthProfile> {
    let accessToken = input.accessToken?.trim();
    if (!accessToken && input.code?.trim()) {
      accessToken = await this.exchangeGithubCode(
        input.code.trim(),
        input.codeVerifier?.trim(),
      );
    }
    if (!accessToken) {
      throw unauthorized('Code ou accessToken GitHub requis.');
    }

    const headers = {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'BoulotFlash',
      'x-github-api-version': '2022-11-28',
    };

    const res = await fetch('https://api.github.com/user', { headers });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      this.logger.warn(`GitHub /user HTTP ${res.status}`);
      throw unauthorized('Profil GitHub inaccessible.');
    }

    const providerUserId =
      data.id != null ? String(data.id) : asString(data.node_id);
    if (!providerUserId) {
      throw unauthorized('Profil GitHub sans identifiant.');
    }

    const emailFromProfile = asString(data.email)?.toLowerCase() ?? null;
    const emailInfo = await this.resolveGithubEmail(headers, emailFromProfile);

    return {
      provider: 'github',
      providerUserId,
      email: emailInfo.email,
      emailVerified: emailInfo.verified,
      displayName: asString(data.name) ?? asString(data.login) ?? null,
      avatarUrl: asString(data.avatar_url) ?? null,
      phoneE164: null,
    };
  }

  private async resolveGithubEmail(
    headers: Record<string, string>,
    fallback: string | null,
  ): Promise<{ email: string | null; verified: boolean }> {
    try {
      const res = await fetch('https://api.github.com/user/emails', { headers });
      if (!res.ok) return { email: fallback, verified: !!fallback };
      const list = (await res.json().catch(() => [])) as Array<{
        email?: string;
        primary?: boolean;
        verified?: boolean;
      }>;
      if (!Array.isArray(list) || list.length === 0) {
        return { email: fallback, verified: !!fallback };
      }
      const primary =
        list.find((e) => e.primary && e.verified) ??
        list.find((e) => e.verified) ??
        list.find((e) => e.primary) ??
        list[0];
      const email = asString(primary?.email)?.toLowerCase() ?? fallback;
      return { email, verified: primary?.verified === true && !!email };
    } catch {
      return { email: fallback, verified: !!fallback };
    }
  }

  private async exchangeMetaCode(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<string> {
    const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    url.searchParams.set('client_id', required('META_APP_ID'));
    url.searchParams.set('client_secret', required('META_APP_SECRET'));
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('code', code);
    if (codeVerifier) url.searchParams.set('code_verifier', codeVerifier);

    const res = await fetch(url);
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || typeof json.access_token !== 'string') {
      this.logger.warn(`Meta token exchange HTTP ${res.status}`);
      throw unauthorized('Échange code Meta refusé.');
    }
    return json.access_token;
  }

  private async exchangeGithubCode(
    code: string,
    codeVerifier?: string,
  ): Promise<string> {
    const body: Record<string, string> = {
      client_id: required('GITHUB_CLIENT_ID'),
      client_secret: required('GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: required('GITHUB_REDIRECT_URI'),
    };
    if (codeVerifier) body.code_verifier = codeVerifier;

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || typeof json.access_token !== 'string') {
      this.logger.warn(
        `GitHub token exchange HTTP ${res.status} error=${String(json.error ?? '')}`,
      );
      throw unauthorized('Échange code GitHub refusé.');
    }
    return json.access_token;
  }
}

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new HttpException(
      { code: 'OAUTH_MISCONFIGURED', message: `Config manquante : ${key}.` },
      503,
    );
  }
  return value;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function unauthorized(message: string): never {
  throw new HttpException({ code: 'UNAUTHORIZED', message }, 401);
}
