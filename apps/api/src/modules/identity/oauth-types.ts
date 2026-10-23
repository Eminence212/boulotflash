export type OauthProvider = 'google' | 'facebook' | 'github';

/** Profil déjà vérifié auprès du provider (jamais de confiance client brute). */
export type VerifiedOauthProfile = {
  provider: OauthProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  phoneE164: string | null;
};

export type OauthCredentialInput = {
  code?: string;
  codeVerifier?: string;
  idToken?: string;
  accessToken?: string;
};
