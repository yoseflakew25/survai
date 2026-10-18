'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationCard } from '@/components/ui/notification-card';
import { useRouter } from 'next/navigation';
import { useNotificationStore, type Notification } from '../utils/store';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SurvaiPanel } from '@/components/survai-panel';

type NotifTab = 'all' | 'unread' | 'surveys' | 'reviews' | 'reports' | 'team';

const filters: { id: NotifTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'surveys', label: 'Surveys' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'reports', label: 'Reports' },
  { id: 'team', label: 'Team' }
];

const actionRoutes: Record<string, string> = {
  view: '/dashboard/surveys'
};

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } =
    useNotificationStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotifTab>('all');
  const count = unreadCount();

  const surveyNotifications = notifications.filter((n) => n.type === 'survey');
  const reviewNotifications = notifications.filter((n) => n.type === 'review');
  const reportNotifications = notifications.filter((n) => n.type === 'report');
  const teamNotifications = notifications.filter((n) => n.type === 'team');
  const unreadNotifications = notifications.filter((n) => n.status === 'unread');

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'all':
        return notifications;
      case 'unread':
        return unreadNotifications;
      case 'surveys':
        return surveyNotifications;
      case 'reviews':
        return reviewNotifications;
      case 'reports':
        return reportNotifications;
      case 'team':
        return teamNotifications;
      default:
        return notifications;
    }
  };

  const getCount = (tab: NotifTab) => {
    switch (tab) {
      case 'all':
        return notifications.length;
      case 'unread':
        return count;
      case 'surveys':
        return surveyNotifications.length;
      case 'reviews':
        return reviewNotifications.length;
      case 'reports':
        return reportNotifications.length;
      case 'team':
        return teamNotifications.length;
      default:
        return 0;
    }
  };

  const filtered = getFilteredNotifications();

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-2 pb-8 md:px-6 md:pt-4'>
      <header className='mb-5 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <div className='flex flex-wrap items-center gap-2.5'>
            <h1 className='font-display text-2xl font-extrabold tracking-tight text-foreground'>
              Notifications
            </h1>
            {count > 0 ? (
              <Badge className='border-transparent bg-brand text-brand-foreground'>
                {count} unread
              </Badge>
            ) : null}
          </div>
          <p className='text-muted-foreground mt-1 text-sm'>
            Surveys, reviews, reports, and team activity.
          </p>
        </div>
        {count > 0 ? (
          <Button variant='outline' size='sm' onClick={markAllAsRead}>
            <Icons.check className='mr-1.5 size-3.5' />
            Mark all as read
          </Button>
        ) : null}
      </header>

      <div
        role='tablist'
        aria-label='Notification filters'
        className='mb-4 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      >
        {filters.map((item) => {
          const isActive = activeTab === item.id;
          const tabCount = getCount(item.id);

          return (
            <button
              key={item.id}
              type='button'
              role='tab'
              aria-selected={isActive}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
              {tabCount > 0 ? (
                <span
                  className={cn(
                    'font-mono text-[11px] tabular-nums',
                    isActive ? 'text-background/70' : 'text-muted-foreground'
                  )}
                >
                  {tabCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <SurvaiPanel>
        {filtered.length === 0 ? (
          <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
            <div className='mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-foreground'>
              <Icons.notification className='size-5' />
            </div>
            <p className='font-display font-bold tracking-tight text-foreground'>
              No notifications
            </p>
            <p className='text-muted-foreground mt-1 max-w-xs text-sm'>
              You&apos;re all caught up. New activity will show up here.
            </p>
          </div>
        ) : (
          <div className='divide-y divide-border'>
            {filtered.map((notification) => (
              <NotificationCard
                key={notification.id}
                id={notification.id}
                title={notification.title}
                body={notification.body}
                status={notification.status}
                createdAt={notification.createdAt}
                actions={notification.actions}
                onMarkAsRead={markAsRead}
                onAction={(notifId, actionId) => {
                  const route = actionRoutes[actionId];
                  if (route) {
                    markAsRead(notifId);
                    router.push(route);
                  }
                }}
              />
            ))}
          </div>
        )}
      </SurvaiPanel>
    </div>
  );
}
