'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { cn } from '@/lib/utils';

import {
  notificationActions,
  markAllNotificationsRead,
  markNotificationRead
} from '../api/service';
import {
  notificationKeys,
  notificationsQueryOptions,
  unreadCountQueryOptions
} from '../api/queries';
import type { NotificationFilterGroup, OrgNotification } from '../api/types';

type NotifTab = 'all' | 'unread' | 'surveys' | 'reviews' | 'reports';

const filters: { id: NotifTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'surveys', label: 'Surveys' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'reports', label: 'Reports' }
];

function groupForTab(tab: NotifTab): NotificationFilterGroup | null {
  if (tab === 'surveys') return 'survey';
  if (tab === 'reviews') return 'review';
  if (tab === 'reports') return 'report';
  return null;
}

export function NotificationCenter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotifTab>('all');

  const listQuery = useQuery(notificationsQueryOptions());
  const unreadQuery = useQuery(unreadCountQueryOptions());

  const notifications = listQuery.data?.notifications ?? [];
  const count = unreadQuery.data ?? listQuery.data?.unreadCount ?? 0;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate
  });

  const byGroup = (group: NotificationFilterGroup) =>
    notifications.filter((n) => n.group === group);

  const unreadNotifications = notifications.filter((n) => n.status === 'unread');
  const surveyNotifications = byGroup('survey');
  const reviewNotifications = byGroup('review');
  const reportNotifications = byGroup('report');

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
      default:
        return 0;
    }
  };

  const openNotification = (n: OrgNotification) => {
    if (n.status === 'unread') {
      markReadMutation.mutate(n.id);
    }
    if (n.href) {
      setOpen(false);
      router.push(n.href);
    }
  };

  const handleAction = (notifId: string) => {
    const n = notifications.find((item) => item.id === notifId);
    if (!n) return;
    openNotification(n);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant='ghost' size='icon' className='relative size-8' />
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
        <SheetHeader className='relative shrink-0 space-y-0 overflow-hidden border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand p-0 text-left'>
          <div
            className='pointer-events-none absolute inset-0 opacity-35'
            aria-hidden
            style={{
              backgroundImage:
                'linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
              maskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)'
            }}
          />
          <div className='relative space-y-3 px-4 py-4 pr-12'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <SheetTitle className='font-display text-lg font-extrabold tracking-tight text-foreground'>
                    Notifications
                  </SheetTitle>
                  {count > 0 ? (
                    <span className='rounded-full border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-foreground px-2 py-0.5 font-mono text-[10px] font-bold text-background'>
                      {count} unread
                    </span>
                  ) : null}
                </div>
                <SheetDescription className='mt-0.5 text-foreground/70'>
                  Survey lifecycle updates for your organization.
                </SheetDescription>
              </div>
              {count > 0 ? (
                <Button
                  variant='outline'
                  size='sm'
                  className='shrink-0 rounded-xl border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-foreground/10 text-foreground hover:bg-foreground/15'
                  disabled={markAllMutation.isPending}
                  onClick={() => markAllMutation.mutate()}
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
                const group = groupForTab(item.id);

                return (
                  <button
                    key={item.id}
                    type='button'
                    role='tab'
                    aria-selected={isActive}
                    data-group={group ?? undefined}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-foreground text-background'
                        : 'bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-foreground/75 hover:bg-[color-mix(in_srgb,var(--foreground)_16%,transparent)] hover:text-foreground'
                    )}
                  >
                    {item.label}
                    {tabCount > 0 ? (
                      <span
                        className={cn(
                          'font-mono text-[11px] tabular-nums',
                          isActive ? 'text-background/70' : 'text-foreground/55'
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
          {listQuery.isLoading ? (
            <div className='text-muted-foreground px-6 py-16 text-center text-sm'>
              Loading notifications…
            </div>
          ) : filtered.length === 0 ? (
            <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
              <div className='mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-foreground'>
                <Icons.notification className='size-5' />
              </div>
              <p className='font-display font-bold tracking-tight text-foreground'>
                {notifications.length === 0 ? 'All caught up' : 'No matches'}
              </p>
              <p className='text-muted-foreground mt-1 max-w-xs text-sm'>
                {notifications.length === 0
                  ? 'Publish, responses, reviews, and reports will show up here.'
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
                  actions={notificationActions(notification)}
                  onMarkAsRead={(id) => markReadMutation.mutate(id)}
                  onAction={(id) => handleAction(id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
