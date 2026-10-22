const API_PREFIX = '/api/v1';

export type ApiError = {
  code?: string;
  message?: string;
};

export async function apiFetch<T>(
  path: string,
  opts: {
    method?: string;
    body?: unknown;
    accessToken?: string | null;
  } = {},
): Promise<{ status: number; data: T & ApiError }> {
  const headers: Record<string, string> = {
    accept: 'application/json',
  };
  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  if (opts.accessToken) {
    headers.authorization = `Bearer ${opts.accessToken}`;
  }
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    credentials: 'include',
  });
  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  return { status: res.status, data };
}

const ACCESS_KEY = 'bf_access_token';

export function saveAccessToken(token: string): void {
  try {
    sessionStorage.setItem(ACCESS_KEY, token);
  } catch {
    // ignore
  }
}

export function readAccessToken(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function clearAccessToken(): void {
  try {
    sessionStorage.removeItem(ACCESS_KEY);
  } catch {
    // ignore
  }
}
