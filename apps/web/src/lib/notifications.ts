import { apiFetch, readAccessToken } from '@/lib/api';

/** Ligne du centre in-app (`GET /notifications`). Jamais de numéro ni d’adresse exacte. */
export type InAppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  /** Écran à ouvrir, calculé par l’API selon le rôle du destinataire. */
  href: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResponse = { unreadCount: number; items: InAppNotification[] };

export async function fetchNotifications(unreadOnly = false): Promise<NotificationsResponse | null> {
  const token = readAccessToken();
  if (!token) return null;
  const { status, data } = await apiFetch<NotificationsResponse>(
    `/notifications${unreadOnly ? '?unread=1' : ''}`,
    { accessToken: token, cache: 'no-store' },
  );
  if (status >= 400) return null;
  return { unreadCount: data.unreadCount ?? 0, items: data.items ?? [] };
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const token = readAccessToken();
  if (!token) return false;
  const { status } = await apiFetch(`/notifications/${id}/read`, { method: 'POST', accessToken: token });
  return status < 400;
}

/** « 3 non lues », pour la cloche et l’en-tête du centre. */
export function unreadLabel(count: number): string {
  if (count <= 0) return 'Aucune notification non lue';
  return count === 1 ? '1 notification non lue' : `${count} notifications non lues`;
}
