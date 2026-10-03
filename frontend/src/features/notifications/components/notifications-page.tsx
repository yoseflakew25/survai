'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NotificationCard } from '@/components/ui/notification-card';
import { useRouter } from 'next/navigation';
import { useNotificationStore, type Notification } from '../utils/store';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type NotifTab = 'all' | 'unread' | 'surveys' | 'reviews' | 'reports' | 'team';

const navItems: { id: NotifTab; label: string; icon: keyof typeof Icons }[] = [
  { id: 'all', label: 'All', icon: 'notification' },
  { id: 'unread', label: 'Unread', icon: 'mail' },
  { id: 'surveys', label: 'Surveys', icon: 'survey' },
  { id: 'reviews', label: 'Reviews', icon: 'review' },
  { id: 'reports', label: 'Reports', icon: 'report' },
  { id: 'team', label: 'Team', icon: 'teams' }
];

const actionRoutes: Record<string, string> = {
  view: '/dashboard/surveys'
};

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotificationStore();
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
      case 'all': return notifications;
      case 'unread': return unreadNotifications;
      case 'surveys': return surveyNotifications;
      case 'reviews': return reviewNotifications;
      case 'reports': return reportNotifications;
      case 'team': return teamNotifications;
      default: return notifications;
    }
  };

  const getCount = (tab: NotifTab) => {
    switch (tab) {
      case 'all': return notifications.length;
      case 'unread': return count;
      case 'surveys': return surveyNotifications.length;
      case 'reviews': return reviewNotifications.length;
      case 'reports': return reportNotifications.length;
      case 'team': return teamNotifications.length;
      default: return 0;
    }
  };

  const renderList = (items: Notification[]) => {
    if (items.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-20'>
          <div className='bg-muted/50 mb-4 rounded-full p-4'>
            <Icons.notification className='text-muted-foreground/30 size-8' />
          </div>
          <p className='text-foreground font-medium'>No notifications</p>
          <p className='text-muted-foreground mt-1 text-sm'>
            You&apos;re all caught up. Check back later.
          </p>
        </div>
      );
    }

    return (
      <div className='rounded-xl border divide-y'>
        {items.map((notification) => (
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
    );
  };

  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-4 md:px-6 md:pt-4'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold tracking-tight text-primary dark:text-white'>Notifications</h1>
        <p className='text-muted-foreground text-sm'>
          Stay updated on your surveys, reviews, and team activity.
        </p>
      </div>

      <div className='flex flex-1 gap-6'>
        {/* Sidebar */}
        <nav className='w-48 shrink-0'>
          <div className='space-y-1'>
            {navItems.map((item) => {
              const Icon = Icons[item.icon];
              const isActive = activeTab === item.id;
              const tabCount = getCount(item.id);
              const hasUnread = item.id === 'unread' && count > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className='size-5' />
                  <span className='flex-1 text-left'>{item.label}</span>
                  {tabCount > 0 && (
                    <Badge
                      variant={hasUnread ? 'default' : 'secondary'}
                      className='h-5 px-1.5 text-[10px]'
                    >
                      {tabCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mark all as read */}
          {count > 0 && (
            <div className='mt-6 pt-4 border-t'>
              <Button variant='outline' size='sm' className='w-full' onClick={markAllAsRead}>
                <Icons.check className='mr-2 size-4' />
                Mark all as read
              </Button>
            </div>
          )}
        </nav>

        <Separator orientation='vertical' className='h-auto' />

        {/* Content */}
        <div className='flex-1 min-w-0'>
          {renderList(getFilteredNotifications())}
        </div>
      </div>
    </div>
  );
}
