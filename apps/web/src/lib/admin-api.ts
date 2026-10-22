import { apiFetch, type ApiError } from '@/lib/api';

const ADMIN_ACCESS_KEY = 'bf_admin_access_token';

export function saveAdminAccessToken(token: string): void {
  try {
    sessionStorage.setItem(ADMIN_ACCESS_KEY, token);
  } catch {
    // ignore
  }
}

export function readAdminAccessToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_ACCESS_KEY);
  } catch {
    return null;
  }
}

export function clearAdminAccessToken(): void {
  try {
    sessionStorage.removeItem(ADMIN_ACCESS_KEY);
  } catch {
    // ignore
  }
}

export async function adminFetch<T>(
  path: string,
  opts: {
    method?: string;
    body?: unknown;
  } = {},
): Promise<{ status: number; data: T & ApiError }> {
  return apiFetch<T>(path, {
    method: opts.method,
    body: opts.body,
    accessToken: readAdminAccessToken(),
  });
}
