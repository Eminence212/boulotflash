import type { Response } from 'express';
import { refreshCookieSecure } from '../cookie';

export const ADMIN_REFRESH_COOKIE = 'bf_admin_refresh';
export const ADMIN_CHALLENGE_COOKIE = 'bf_admin_challenge';

/** Marqueur userAgent pour distinguer les refresh admin dans refresh_tokens. */
export const ADMIN_REFRESH_UA = 'admin-session';

function cookieParts(
  name: string,
  value: string,
  maxAgeSec: number,
): string[] {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (refreshCookieSecure()) parts.push('Secure');
  return parts;
}

export function setAdminRefreshCookie(
  res: Response,
  token: string,
  maxAgeSec: number,
): void {
  res.append('Set-Cookie', cookieParts(ADMIN_REFRESH_COOKIE, token, maxAgeSec).join('; '));
}

export function clearAdminRefreshCookie(res: Response): void {
  res.append('Set-Cookie', cookieParts(ADMIN_REFRESH_COOKIE, '', 0).join('; '));
}

export function setAdminChallengeCookie(
  res: Response,
  token: string,
  maxAgeSec: number,
): void {
  res.append(
    'Set-Cookie',
    cookieParts(ADMIN_CHALLENGE_COOKIE, token, maxAgeSec).join('; '),
  );
}

export function clearAdminChallengeCookie(res: Response): void {
  res.append('Set-Cookie', cookieParts(ADMIN_CHALLENGE_COOKIE, '', 0).join('; '));
}
