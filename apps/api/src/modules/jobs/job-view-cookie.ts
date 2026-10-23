import type { Response } from 'express';
import { parseCookies, refreshCookieSecure } from '../identity/cookie';

/** Visites du détail déjà comptées pour ce navigateur. */
export const JOB_VIEWS_COOKIE = 'bf_job_views';

const MAX_IDS = 40;

function idsFromCookie(header: string | undefined): string[] {
  const raw = parseCookies(header)[JOB_VIEWS_COOKIE] ?? '';
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function hasViewedJob(
  cookieHeader: string | undefined,
  jobId: string,
): boolean {
  return idsFromCookie(cookieHeader).includes(jobId);
}

export function rememberViewedJob(
  cookieHeader: string | undefined,
  jobId: string,
): string {
  const next = [
    jobId,
    ...idsFromCookie(cookieHeader).filter((id) => id !== jobId),
  ].slice(0, MAX_IDS);
  return next.join(',');
}

export function setJobViewsCookie(res: Response, value: string): void {
  const parts = [
    `${JOB_VIEWS_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${60 * 60 * 24 * 365}`,
  ];
  if (refreshCookieSecure()) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}
