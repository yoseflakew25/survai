'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
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
  panelWashClass,
  quietActionClass,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { useTranslations } from 'next-intl';

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

const FILTER_TABS: NotifTab[] = [
  'all',
  'unread',
  'surveys',
  'reviews',
  'reports'
];

function groupForTab(tab: NotifTab): NotificationFilterGroup | null {
  if (tab === 'surveys') return 'survey';
  if (tab === 'reviews') return 'review';
  if (tab === 'reports') return 'report';
  return null;
}

export function NotificationCenter() {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();

  const filterLabel = (tab: NotifTab) => {
    switch (tab) {
      case 'all':
        return tCommon('all');
      case 'unread':
        return t('unread');
      case 'surveys':
        return t('surveys');
      case 'reviews':
        return t('reviews');
      case 'reports':
        return t('reports');
    }
  };

  const actionLabel = (type: OrgNotification['type']) => {
    switch (type) {
      case 'survey_published':
        return t('openCollect');
      case 'survey_closed':
        return t('viewAnalytics');
      case 'response_received':
        return t('viewResponse');
      case 'response_milestone':
      case 'response_digest':
        return t('viewRespondents');
      case 'review_complete':
        return t('viewReview');
      case 'report_ready':
      case 'report_failed':
        return t('openReport');
      default:
        return tCommon('open');
    }
  };
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotifTab>('all');

  const unreadQuery = useQuery(unreadCountQueryOptions());
  const listQuery = useQuery(notificationsQueryOptions(open));

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
          {count > 0
            ? `${t('title')} (${t('unreadCount', { count })})`
            : t('title')}
        </span>
      </SheetTrigger>

      <SheetContent
        side='right'
        showCloseButton
        className='flex !w-full flex-col gap-0 overflow-hidden border-l border-border bg-background p-0 sm:!max-w-none md:!w-[min(100%,42rem)]'
      >
        <SheetHeader className='sr-only'>
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription>{t('subtitle')}</SheetDescription>
        </SheetHeader>

        <div className={cn(panelWashClass, 'relative shrink-0 pr-12')}>
          <SurvaiPanelHeader
            tone='soft'
            className='border-0 bg-transparent px-4 py-3.5 sm:px-5'
            // icon={<Icons.notification className='size-4' />}
            title={t('title')}
            subtitle={t('subtitle')}
            badge={
              count > 0 ? (
                <Badge variant='meta' className='tabular-nums'>
                  {t('unreadCount', { count })}
                </Badge>
              ) : null
            }
            actions={
              count > 0 ? (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className={cn(quietActionClass, 'h-9 shrink-0')}
                  disabled={markAllMutation.isPending}
                  onClick={() => markAllMutation.mutate()}
                >
                  <Icons.check className='size-3.5' />
                  {t('markAllRead')}
                </Button>
              ) : null
            }
          />

          <div
            role='tablist'
            aria-label={t('filtersAria')}
            className='flex flex-wrap gap-0 border-y border-foreground/12 bg-background/50 px-4 sm:px-5'
          >
            {FILTER_TABS.map((tab) => {
              const isActive = activeTab === tab;
              const tabCount = getCount(tab);
              const group = groupForTab(tab);

              return (
                <button
                  key={tab}
                  type='button'
                  role='tab'
                  aria-selected={isActive}
                  data-group={group ?? undefined}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 border-r border-foreground/10 px-3 py-2.5 text-sm font-medium transition-colors last:border-r-0',
                    isActive
                      ? 'bg-[color-mix(in_srgb,var(--brand)_32%,var(--background))] text-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  <span>{filterLabel(tab)}</span>
                  {tabCount > 0 ? (
                    <span
                      className={cn(
                        'min-w-[1.25rem] rounded-none border px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold tabular-nums',
                        isActive
                          ? 'border-foreground/15 bg-card text-foreground'
                          : 'border-transparent bg-muted/50 text-muted-foreground'
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

        <ScrollArea className='min-h-0 flex-1 bg-muted/10'>
          {listQuery.isLoading ? (
            <div className='text-muted-foreground px-5 py-14 text-center text-sm'>
              {t('loading')}
            </div>
          ) : filtered.length === 0 ? (
            <div className='flex flex-col items-center justify-center px-6 py-14 text-center'>
              <div className='mb-3 flex size-11 items-center justify-center rounded-none border border-border bg-card text-foreground'>
                <Icons.notification className='size-5' />
              </div>
              <p className='font-display text-base font-semibold tracking-tight text-foreground'>
                {notifications.length === 0 ? t('allCaughtUp') : t('noMatches')}
              </p>
              <p className='text-muted-foreground mt-1 max-w-sm text-sm leading-snug'>
                {notifications.length === 0 ? t('emptyHint') : t('filterHint')}
              </p>
            </div>
          ) : (
            <ul className='divide-y divide-border border-b border-border bg-card'>
              {filtered.map((notification) => (
                <li key={notification.id}>
                  <NotificationCard
                    id={notification.id}
                    title={notification.title}
                    body={notification.body}
                    status={notification.status}
                    createdAt={notification.createdAt}
                    category={notification.group}
                    eventType={notification.type}
                    compact
                    actions={(() => {
                      const actions = notificationActions(notification);
                      if (!actions) return undefined;
                      const label = actionLabel(notification.type);
                      return actions.map((action) => ({ ...action, label }));
                    })()}
                    onMarkAsRead={(id) => markReadMutation.mutate(id)}
                    onAction={(id) => handleAction(id)}
                    onOpen={(id) => handleAction(id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}