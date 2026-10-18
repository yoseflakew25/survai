'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationCard } from '@/components/ui/notification-card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { useNotificationStore } from '../utils/store';
import { cn } from '@/lib/utils';

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

export function NotificationCenter() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } =
    useNotificationStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotifTab>('all');
  const count = unreadCount();

  const surveyNotifications = notifications.filter((n) => n.type === 'survey');
  const reviewNotifications = notifications.filter((n) => n.type === 'review');
  const reportNotifications = notifications.filter((n) => n.type === 'report');
  const teamNotifications = notifications.filter((n) => n.type === 'team');
  const unreadNotifications = notifications.filter((n) => n.status === 'unread');

  const filtered = (() => {
    switch (activeTab) {
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
  })();

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

  const handleAction = (notifId: string, actionId: string) => {
    const route = actionRoutes[actionId];
    if (!route) return;
    markAsRead(notifId);
    setOpen(false);
    router.push(route);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className='relative size-8'
          />
        }
      >
        <Icons.notification className='size-5' />
        {count > 0 ? (
          <span className='bg-brand text-brand-foreground absolute top-1 right-1 size-2 rounded-full' />
        ) : null}
        <span className='sr-only'>
          Notifications{count > 0 ? ` (${count} unread)` : ''}
        </span>
      </SheetTrigger>

      <SheetContent
        side='right'
        showCloseButton
        className='!w-full gap-0 overflow-hidden p-0 sm:!max-w-none md:!w-1/2'
      >
        <SheetHeader className='relative shrink-0 space-y-0 border-b border-border bg-card p-0 text-left'>
          <div
            className='pointer-events-none absolute inset-0 opacity-60'
            style={{
              backgroundImage:
                'radial-gradient(ellipse 90% 140% at 0% 0%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 55%)'
            }}
          />
          <div className='relative space-y-3 px-4 py-4 pr-12'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <SheetTitle className='font-display text-lg font-extrabold tracking-tight'>
                    Notifications
                  </SheetTitle>
                  {count > 0 ? (
                    <span className='rounded-full bg-brand px-2 py-0.5 font-mono text-[10px] font-bold text-brand-foreground'>
                      {count} unread
                    </span>
                  ) : null}
                </div>
                <SheetDescription className='mt-0.5'>
                  Surveys, reviews, reports, and team activity.
                </SheetDescription>
              </div>
              {count > 0 ? (
                <Button
                  variant='outline'
                  size='sm'
                  className='shrink-0 rounded-xl'
                  onClick={markAllAsRead}
                >
                  <Icons.check className='mr-1.5 size-3.5' />
                  Mark all as read
                </Button>
              ) : null}
            </div>

            <div
              role='tablist'
              aria-label='Notification filters'
              className='flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
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
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
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
                          isActive
                            ? 'text-background/70'
                            : 'text-muted-foreground'
                        )}
                      >
                        {tabCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className='min-h-0 flex-1'>
          {filtered.length === 0 ? (
            <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
              <div className='mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-foreground'>
                <Icons.notification className='size-5' />
              </div>
              <p className='font-display font-bold tracking-tight text-foreground'>
                {notifications.length === 0 ? 'All caught up' : 'No matches'}
              </p>
              <p className='text-muted-foreground mt-1 max-w-xs text-sm'>
                {notifications.length === 0
                  ? 'New survey activity will show up here.'
                  : 'Try another filter to see more notifications.'}
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
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
