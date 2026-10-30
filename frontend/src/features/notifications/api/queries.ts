import { queryOptions } from '@tanstack/react-query';

import { getUnreadCount, listNotifications } from './service';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const
};

export const notificationsQueryOptions = () =>
  queryOptions({
    queryKey: notificationKeys.list(),
    queryFn: listNotifications,
    staleTime: 15_000,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true
  });

export const unreadCountQueryOptions = () =>
  queryOptions({
    queryKey: notificationKeys.unread(),
    queryFn: getUnreadCount,
    staleTime: 15_000,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true
  });
