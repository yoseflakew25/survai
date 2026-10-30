import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import {
  actionLabelFor,
  notificationGroup,
  type NotificationApiType,
  type NotificationList,
  type OrgNotification
} from './types';

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error(
    toUserFacingError(new Error(apiErrorMessage(data, fallback)), fallback)
  );
}

type ApiNotification = {
  id: string;
  type: NotificationApiType;
  title: string;
  body: string;
  href: string | null;
  meta: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  status: 'read' | 'unread';
};

type ApiList = {
  notifications: ApiNotification[];
  total: number;
  unread_count: number;
};

function mapOne(n: ApiNotification): OrgNotification {
  return {
    id: n.id,
    type: n.type,
    group: notificationGroup(n.type),
    title: n.title,
    body: n.body,
    href: n.href,
    status: n.status,
    createdAt: n.created_at,
    meta: n.meta
  };
}

export function notificationActions(n: OrgNotification) {
  if (!n.href) return undefined;
  return [
    {
      id: 'view',
      label: actionLabelFor(n.type),
      type: 'redirect' as const,
      style: 'primary' as const
    }
  ];
}

export async function listNotifications(): Promise<NotificationList> {
  try {
    const res = await apiFetch('/notifications?limit=50');
    if (!res.ok) await readError(res, 'Could not load notifications');
    const data = (await res.json()) as ApiList;
    return {
      notifications: data.notifications.map(mapOne),
      total: data.total,
      unreadCount: data.unread_count
    };
  } catch (err) {
    throw new Error(toUserFacingError(err, 'Could not load notifications'));
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const res = await apiFetch('/notifications/unread-count');
    if (!res.ok) await readError(res, 'Could not load unread count');
    const data = (await res.json()) as { unread_count: number };
    return data.unread_count;
  } catch (err) {
    throw new Error(toUserFacingError(err, 'Could not load unread count'));
  }
}

export async function markNotificationRead(id: string): Promise<OrgNotification> {
  const res = await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
  if (!res.ok) await readError(res, 'Could not mark notification as read');
  return mapOne((await res.json()) as ApiNotification);
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await apiFetch('/notifications/read-all', { method: 'POST' });
  if (!res.ok) await readError(res, 'Could not mark notifications as read');
  const data = (await res.json()) as { unread_count: number };
  return data.unread_count;
}
