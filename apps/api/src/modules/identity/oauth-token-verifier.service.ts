import { createRemoteJWKSet, jwtVerify } from 'jose';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import {
  type OauthCredentialInput,
  type OauthProvider,
  type VerifiedOauthProfile,
} from './oauth-types';
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
      case 'instagram':
        return this.verifyInstagram(input);
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
      instagram: {
        clientId: required('META_APP_ID'),
        redirectUri: required('INSTAGRAM_REDIRECT_URI'),
        authUrl: 'https://www.instagram.com/oauth/authorize',
        scopes: 'instagram_business_basic',
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

    const idToken = tokenJson.id_token;
    if (typeof idToken === 'string' && idToken.length > 0) {
      return this.verifyGoogleIdToken(idToken);
    }

    const accessToken = tokenJson.access_token;
    if (typeof accessToken !== 'string') {
      throw unauthorized('Réponse Google sans jeton utilisable.');
    }
    const infoRes = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    const info = (await infoRes.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!infoRes.ok) {
      throw unauthorized('Userinfo Google inaccessible.');
    }
    return this.mapGoogleClaims(info);
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
      avatarUrl: asString(claims.picture) ?? null,
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

    const picture = data.picture as { data?: { url?: string } } | undefined;
    return {
      provider: 'facebook',
      providerUserId: asString(data.id)!,
      email: asString(data.email)?.toLowerCase() ?? null,
      emailVerified: !!asString(data.email),
      displayName: asString(data.name) ?? null,
      avatarUrl: picture?.data?.url ?? null,
      phoneE164: normalizePilotPhone(asString(data.mobile_phone)),
    };
  }

  private async verifyInstagram(
    input: OauthCredentialInput,
  ): Promise<VerifiedOauthProfile> {
    let accessToken = input.accessToken?.trim();
    let userIdFromToken: string | null = null;

    if (!accessToken && input.code?.trim()) {
      const exchanged = await this.exchangeInstagramCode(input.code.trim());
      accessToken = exchanged.accessToken;
      userIdFromToken = exchanged.userId;
    }
    if (!accessToken) {
      throw unauthorized('Code ou accessToken Instagram requis.');
    }

    const url = new URL('https://graph.instagram.com/v21.0/me');
    url.searchParams.set(
      'fields',
      'user_id,username,name,account_type,profile_picture_url',
    );
    url.searchParams.set('access_token', accessToken);
    const res = await fetch(url);
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      this.logger.warn(`Instagram /me HTTP ${res.status}`);
      throw unauthorized('Profil Instagram inaccessible.');
    }

    const providerUserId =
      asString(data.user_id) ?? asString(data.id) ?? userIdFromToken;
    if (!providerUserId) {
      throw unauthorized('Profil Instagram sans identifiant.');
    }

    const displayName =
      asString(data.name) ?? asString(data.username) ?? null;

    return {
      provider: 'instagram',
      providerUserId,
      email: null,
      emailVerified: false,
      displayName,
      avatarUrl: asString(data.profile_picture_url) ?? null,
      phoneE164: null,
    };
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

  private async exchangeInstagramCode(
    code: string,
  ): Promise<{ accessToken: string; userId: string | null }> {
    const body = new URLSearchParams({
      client_id: required('META_APP_ID'),
      client_secret: required('META_APP_SECRET'),
      grant_type: 'authorization_code',
      redirect_uri: required('INSTAGRAM_REDIRECT_URI'),
      code,
    });
    const res = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      this.logger.warn(`Instagram token exchange HTTP ${res.status}`);
      throw unauthorized('Échange code Instagram refusé.');
    }
    const accessToken =
      typeof json.access_token === 'string'
        ? json.access_token
        : Array.isArray(json.data) &&
            typeof (json.data[0] as { access_token?: string })?.access_token ===
              'string'
          ? (json.data[0] as { access_token: string }).access_token
          : null;
    const userId =
      typeof json.user_id === 'number' || typeof json.user_id === 'string'
        ? String(json.user_id)
        : Array.isArray(json.data) &&
            (json.data[0] as { user_id?: string | number })?.user_id != null
          ? String((json.data[0] as { user_id: string | number }).user_id)
          : null;
    if (!accessToken) {
      throw unauthorized('Réponse Instagram sans access_token.');
    }
    return { accessToken, userId };
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
