export type AuthProvider = 'google' | 'facebook' | 'instagram';

const PKCE_KEY = 'bf_oauth_pkce';

export type PkceState = {
  provider: AuthProvider;
  state: string;
  codeVerifier: string;
  ageConfirmed: boolean;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
};

function randomUrlSafe(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64Url(buf);
}

function base64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createPkceChallenge(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}> {
  const codeVerifier = randomUrlSafe(32);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier),
  );
  return {
    codeVerifier,
    codeChallenge: base64Url(digest),
    state: randomUrlSafe(16),
  };
}

export function storePkce(state: PkceState): void {
  sessionStorage.setItem(PKCE_KEY, JSON.stringify(state));
}

export function readPkce(): PkceState | null {
  try {
    const raw = sessionStorage.getItem(PKCE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PkceState;
  } catch {
    return null;
  }
}

export function clearPkce(): void {
  sessionStorage.removeItem(PKCE_KEY);
}

export type OauthPublicConfig = {
  google: {
    clientId: string;
    redirectUri: string;
    authUrl: string;
    scopes: string;
  };
  facebook: {
    clientId: string;
    redirectUri: string;
    authUrl: string;
    scopes: string;
  };
  instagram: {
    clientId: string;
    redirectUri: string;
    authUrl: string;
    scopes: string;
  };
};

export function buildAuthorizeUrl(
  provider: AuthProvider,
  config: OauthPublicConfig,
  opts: { state: string; codeChallenge: string },
): string {
  const entry = config[provider];
  const url = new URL(entry.authUrl);
  url.searchParams.set('client_id', entry.clientId);
  url.searchParams.set('redirect_uri', entry.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', opts.state);

  if (provider === 'google') {
    url.searchParams.set('scope', entry.scopes);
    url.searchParams.set('code_challenge', opts.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('access_type', 'online');
    url.searchParams.set('prompt', 'select_account');
  } else if (provider === 'facebook') {
    url.searchParams.set('scope', entry.scopes);
    // Meta web Login : PKCE optionnel selon app ; on envoie code_challenge si supporté
    url.searchParams.set('code_challenge', opts.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
  } else {
    url.searchParams.set('scope', entry.scopes);
    url.searchParams.set('enable_fb_login', '0');
  }

  return url.toString();
}
