import type { Response } from 'express';

export const REFRESH_COOKIE = 'bf_refresh';

export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function refreshCookieSecure(): boolean {
  const appEnv = (process.env.APP_ENV ?? 'development').trim().toLowerCase();
  return appEnv !== 'development';
}

export function setRefreshCookie(res: Response, token: string, maxAgeSec: number): void {
  const parts = [
    `${REFRESH_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (refreshCookieSecure()) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

export function clearRefreshCookie(res: Response): void {
  const parts = [
    `${REFRESH_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (refreshCookieSecure()) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}
