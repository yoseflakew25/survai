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
  onAction?: (notificationId: string, actionId: string, actionType: ActionType) => void;
  loadingActionId?: string;
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
  const iconProps = { size: 12, strokeWidth: 2.5 };
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
  className
}) => {
  const isUnread = status === 'unread';

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/30',
        isUnread && 'bg-primary/[0.02]',
        className
      )}
    >
      {/* Unread indicator */}
      <div className='mt-1.5'>
        {isUnread ? (
          <div className='h-2 w-2 rounded-full bg-primary' />
        ) : (
          <div className='h-2 w-2 rounded-full bg-transparent' />
        )}
      </div>

      {/* Content */}
      <div className='flex-1 min-w-0 space-y-1'>
        <div className='flex items-start justify-between gap-2'>
          <h3
            className={cn(
              'text-sm leading-snug',
              isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
            )}
          >
            {title}
          </h3>
          <div className='flex items-center gap-2 shrink-0'>
            {createdAt && (
              <span className='text-muted-foreground text-xs whitespace-nowrap'>
                {formatDate(createdAt)}
              </span>
            )}
            {isUnread && onMarkAsRead && (
              <button
                type='button'
                onClick={() => onMarkAsRead(id)}
                className='rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100'
                aria-label='Mark as read'
              >
                <Icons.check size={14} />
              </button>
            )}
          </div>
        </div>

        <p className={cn('text-sm', isUnread ? 'text-muted-foreground' : 'text-muted-foreground/70')}>
          {body}
        </p>

        {/* Actions */}
        {actions.length > 0 && (
          <div className={cn('flex flex-wrap items-center gap-2 pt-1', !isUnread && 'opacity-60')}>
            {actions.map((action) => {
              const isLoading = loadingActionId === action.id;
              const isExecuted = action.executed || false;
              const showLoading = isLoading && action.type !== 'modal';

              return (
                <button
                  key={action.id}
                  type='button'
                  disabled={isLoading || isExecuted}
                  onClick={() => onAction?.(id, action.id, action.type)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors',
                    action.style === 'primary'
                      ? 'border-primary/30 text-primary hover:bg-primary/5'
                      : action.style === 'danger'
                        ? 'border-destructive/30 text-destructive hover:bg-destructive/5'
                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                    showLoading && 'opacity-50',
                    isExecuted && 'cursor-not-allowed opacity-60'
                  )}
                >
                  {showLoading ? (
                    <Icons.spinner size={12} className='animate-spin' />
                  ) : (
                    <>
                      <span>{action.label}</span>
                      {isExecuted ? (
                        <Icons.check size={12} strokeWidth={2.5} />
                      ) : (
                        getActionIcon(action.type)
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
