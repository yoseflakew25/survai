'use client';

import type { FC } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

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
  loadingActionId?: string;
  /** Tighter spacing for popovers / drawers. */
  compact?: boolean;
  className?: string;
}

const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

const getActionIcon = (actionType: ActionType) => {
  const iconProps = { className: 'size-3', strokeWidth: 2.5 };
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
  loadingActionId,
  compact = false,
  className
}) => {
  const isUnread = status === 'unread';

  return (
    <div
      className={cn(
        'group relative transition-colors',
        compact ? 'px-3.5 py-3' : 'px-5 py-3.5',
        isUnread ? 'bg-brand-soft/35' : 'hover:bg-muted/40',
        className
      )}
    >
      <div className='flex gap-2.5'>
        <div className='mt-1.5 w-2 shrink-0'>
          {isUnread ? (
            <span className='block size-2 rounded-full bg-brand shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_35%,transparent)]' />
          ) : null}
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-start gap-3'>
            <h3
              className={cn(
                'min-w-0 flex-1 text-sm leading-snug',
                isUnread
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-muted-foreground'
              )}
            >
              {title}
            </h3>
            <div className='flex shrink-0 items-center gap-1'>
              {createdAt ? (
                <span className='font-mono text-[11px] whitespace-nowrap tabular-nums text-muted-foreground'>
                  {formatDate(createdAt)}
                </span>
              ) : null}
              {isUnread && onMarkAsRead ? (
                <button
                  type='button'
                  onClick={() => onMarkAsRead(id)}
                  className='rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-card hover:text-foreground group-hover:opacity-100'
                  aria-label='Mark as read'
                >
                  <Icons.check className='size-3.5' />
                </button>
              ) : null}
            </div>
          </div>

          <p
            className={cn(
              'mt-1 text-xs leading-relaxed',
              isUnread ? 'text-muted-foreground' : 'text-muted-foreground/75',
              compact && 'line-clamp-2'
            )}
          >
            {body}
          </p>

          {actions.length > 0 ? (
            <div
              className={cn(
                'mt-2 flex flex-wrap items-center gap-1.5',
                !isUnread && 'opacity-70'
              )}
            >
              {actions.map((action) => {
                const isLoading = loadingActionId === action.id;
                const isExecuted = action.executed || false;
                const showLoading = isLoading && action.type !== 'modal';
                const isPrimary = action.style === 'primary';

                return (
                  <button
                    key={action.id}
                    type='button'
                    disabled={isLoading || isExecuted}
                    onClick={() => onAction?.(id, action.id, action.type)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                      isPrimary
                        ? 'border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground hover:brightness-95'
                        : action.style === 'danger'
                          ? 'border border-destructive/30 text-destructive hover:bg-destructive/5'
                          : 'border border-border bg-card text-muted-foreground hover:text-foreground',
                      showLoading && 'opacity-50',
                      isExecuted && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    {showLoading ? (
                      <Icons.spinner className='size-3 animate-spin' />
                    ) : (
                      <>
                        <span>{action.label}</span>
                        {isExecuted ? (
                          <Icons.check className='size-3' strokeWidth={2.5} />
                        ) : (
                          getActionIcon(action.type)
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
