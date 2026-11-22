'use client';

import type { FC } from 'react';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';

export type NotificationCategory = 'survey' | 'review' | 'report' | 'system';

export type NotificationStatus = 'unread' | 'read' | 'archived';
export type ActionType = 'redirect' | 'api_call' | 'workflow' | 'modal';
export type ActionStyle = 'primary' | 'danger' | 'default';

export interface NotificationAction {
  id: string;
  label: string;
  type: ActionType;
  style?: ActionStyle;
  executed?: boolean;
}

export interface NotificationCardProps {
  id: string;
  title: string;
  body: string;
  status?: NotificationStatus;
  createdAt?: string | Date;
  actions?: NotificationAction[];
  onMarkAsRead?: (id: string) => void;
  onAction?: (
    notificationId: string,
    actionId: string,
    actionType: ActionType
  ) => void;
  /** Open the notification target (deep-link). Makes the card body clickable. */
  onOpen?: (id: string) => void;
  loadingActionId?: string;
  /** Tighter spacing for popovers / drawers. */
  compact?: boolean;
  category?: NotificationCategory;
  /** Drives status badges (e.g. failed report). */
  eventType?: string;
  className?: string;
}

function formatDate(
  date: string | Date,
  t: ReturnType<typeof useTranslations>,
  locale: string
): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return t('justNow');
  if (diffMins < 60) return t('minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('daysAgo', { count: diffDays });

  return d.toLocaleDateString(locale === 'am' ? 'am-ET' : 'en-US', {
    month: 'short',
    day: 'numeric'
  });
}

function displayTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed && trimmed !== '""' && trimmed !== '“”') return trimmed;
  return '—';
}

function categoryLabel(
  category: NotificationCategory,
  tNotif: ReturnType<typeof useTranslations<'notifications'>>,
  tCommon: ReturnType<typeof useTranslations<'common'>>
): string {
  switch (category) {
    case 'survey':
      return tNotif('surveys');
    case 'review':
      return tNotif('reviews');
    case 'report':
      return tNotif('reports');
    default:
      return tCommon('all');
  }
}

const getActionIcon = (actionType: ActionType) => {
  const iconProps = { className: 'size-3.5', strokeWidth: 2.25 };
  switch (actionType) {
    case 'redirect':
      return <Icons.externalLink {...iconProps} />;
    case 'api_call':
      return <Icons.check {...iconProps} />;
    case 'workflow':
      return <Icons.clock {...iconProps} />;
    case 'modal':
      return <Icons.alertCircle {...iconProps} />;
    default:
      return null;
  }
};

export const NotificationCard: FC<NotificationCardProps> = ({
  id,
  title,
  body,
  status = 'unread',
  createdAt,
  actions = [],
  onMarkAsRead,
  onAction,
  onOpen,
  loadingActionId,
  compact = false,
  category,
  eventType,
  className
}) => {
  const tCommon = useTranslations('common');
  const tNotifications = useTranslations('notifications');
  const locale = useLocale();
  const isUnread = status === 'unread';
  const shownTitle = displayTitle(title);
  const isFailedReport = eventType === 'report_failed';

  const cardClass = cn(
    'group relative w-full text-left transition-colors',
    compact ? 'px-4 py-3.5 sm:px-5' : 'px-5 py-4',
    isUnread
      ? 'border-l-2 border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-[color-mix(in_srgb,var(--brand)_14%,var(--background))]'
      : 'border-l-2 border-transparent hover:bg-muted/30',
    onOpen && 'cursor-pointer',
    className
  );

  const metaBadges = (
    <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
      {category && category !== 'system' ? (
        <Badge variant='meta' className='h-7 px-2.5 text-[11px]'>
          {categoryLabel(category, tNotifications, tCommon)}
        </Badge>
      ) : null}
      {isUnread ? (
        <Badge variant='soft' className='h-7 px-2.5 text-[11px]'>
          {tNotifications('unread')}
        </Badge>
      ) : null}
      {isFailedReport ? (
        <Badge variant='destructive' className='h-7 px-2.5 text-[11px]'>
          {tCommon('error')}
        </Badge>
      ) : null}
    </div>
  );

  const inner = (
    <div className='flex min-w-0 gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4'>
      <div className='min-w-0 space-y-2'>
        {metaBadges}

        <h3
          className={cn(
            'text-base leading-snug tracking-tight',
            isUnread
              ? 'font-semibold text-foreground'
              : 'font-medium text-muted-foreground'
          )}
        >
          {shownTitle}
        </h3>

        <p
          className={cn(
            'text-sm leading-relaxed',
            isUnread ? 'text-muted-foreground' : 'text-muted-foreground/80',
            compact ? 'line-clamp-3' : undefined
          )}
        >
          {body}
        </p>

        {actions.length > 0 ? (
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5 pt-0.5',
              !isUnread && 'opacity-95'
            )}
          >
            {actions.map((action) => {
              const isLoading = loadingActionId === action.id;
              const isExecuted = action.executed || false;
              const showLoading = isLoading && action.type !== 'modal';
              const actionVariant =
                action.style === 'danger'
                  ? 'destructive'
                  : action.style === 'primary'
                    ? 'accent'
                    : 'outline';

              return (
                <Badge
                  key={action.id}
                  variant={actionVariant}
                  className={cn(
                    'h-8 cursor-pointer gap-1 px-2.5 text-xs font-semibold normal-case tracking-normal',
                    (showLoading || isExecuted) && 'pointer-events-none opacity-60'
                  )}
                  render={
                    <button
                      type='button'
                      disabled={isLoading || isExecuted}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction?.(id, action.id, action.type);
                      }}
                    />
                  }
                >
                  {showLoading ? (
                    <Icons.spinner className='size-3.5 animate-spin' />
                  ) : (
                    <>
                      <span>{action.label}</span>
                      {isExecuted ? (
                        <Icons.check className='size-3.5' strokeWidth={2.5} />
                      ) : (
                        getActionIcon(action.type)
                      )}
                    </>
                  )}
                </Badge>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className='flex shrink-0 items-center gap-1.5 sm:flex-col sm:items-end sm:gap-2'>
        {createdAt ? (
          <Badge
            variant='meta'
            className='h-7 border-transparent bg-transparent px-0 font-mono text-[11px] tabular-nums'
          >
            {formatDate(createdAt, tCommon, locale)}
          </Badge>
        ) : null}
        {isUnread && onMarkAsRead ? (
          <Badge
            variant='outline'
            className='h-7 gap-1 px-2 text-[11px] opacity-0 transition-opacity group-hover:opacity-100'
            render={
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(id);
                }}
              />
            }
          >
            <Icons.check className='size-3' />
            {tNotifications('markRead')}
          </Badge>
        ) : null}
      </div>
    </div>
  );

  if (onOpen) {
    return (
      <div
        role='button'
        tabIndex={0}
        className={cardClass}
        onClick={() => onOpen(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(id);
          }
        }}
      >
        {inner}
      </div>
    );
  }

  return <div className={cardClass}>{inner}</div>;
};