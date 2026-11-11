import { queryOptions } from '@tanstack/react-query';

import { getUnreadCount, listNotifications } from './service';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const
};

/** Full list — fetch on demand (sheet open), no background polling. */
export const notificationsQueryOptions = (enabled = true) =>
  queryOptions({
    queryKey: notificationKeys.list(),
    queryFn: listNotifications,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

/** Badge only — light poll; avoids pairing with the heavy list query. */
export const unreadCountQueryOptions = () =>
  queryOptions({
    queryKey: notificationKeys.unread(),
    queryFn: getUnreadCount,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false
  });
