'use client';

import { Icons } from '@/components/icons';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationCard } from '@/components/ui/notification-card';
import { useNotificationStore } from '../utils/store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 5;

const actionRoutes: Record<string, string> = {
  view: '/dashboard/surveys'
};

export function NotificationCenter() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } =
    useNotificationStore();
  const router = useRouter();
  const count = unreadCount();
  const visibleNotifications = notifications.slice(0, MAX_VISIBLE);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className='relative h-8 w-8 rounded-xl'
          />
        }
      >
        <Icons.notification className='size-4' />
        {count > 0 ? (
          <span className='absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[10px] font-bold text-brand-foreground shadow-[0_0_0_2px_var(--background)]'>
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
        <span className='sr-only'>Notifications</span>
      </PopoverTrigger>

      <PopoverContent
        align='end'
        sideOffset={8}
        className='w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-border p-0 shadow-lg sm:w-[420px]'
      >
        <div className='relative border-b border-border bg-card'>
          <div
            className='pointer-events-none absolute inset-0 opacity-60'
            style={{
              backgroundImage:
                'radial-gradient(ellipse 90% 140% at 0% 0%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 55%)'
            }}
          />
          <div className='relative flex items-center justify-between gap-3 px-4 py-3'>
            <div className='flex min-w-0 items-center gap-2'>
              <h4 className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                Notifications
              </h4>
              {count > 0 ? (
                <span className='rounded-full bg-brand px-2 py-0.5 font-mono text-[10px] font-bold text-brand-foreground'>
                  {count} new
                </span>
              ) : null}
            </div>
            {count > 0 ? (
              <Button
                variant='ghost'
                size='sm'
                className='text-muted-foreground h-7 shrink-0 rounded-lg px-2 text-xs hover:text-foreground'
                onClick={markAllAsRead}
              >
                <Icons.check className='mr-1 size-3.5' />
                Mark all read
              </Button>
            ) : null}
          </div>
        </div>

        <ScrollArea className='h-[min(420px,60vh)]'>
          {notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center px-6 py-14 text-center'>
              <div className='mb-3 flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-foreground'>
                <Icons.notification className='size-5' />
              </div>
              <p className='font-display text-sm font-bold tracking-tight'>
                All caught up
              </p>
              <p className='text-muted-foreground mt-1 text-xs'>
                New survey activity will show up here.
              </p>
            </div>
          ) : (
            <div className='divide-y divide-border'>
              {visibleNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  id={notification.id}
                  title={notification.title}
                  body={notification.body}
                  status={notification.status}
                  createdAt={notification.createdAt}
                  actions={notification.actions}
                  compact
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
        </ScrollArea>

        {notifications.length > 0 ? (
          <div className='border-t border-border bg-muted/30 px-3 py-2'>
            <Link
              href='/dashboard/notifications'
              className={cn(
                'flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-foreground transition-colors',
                'hover:bg-card'
              )}
            >
              View all notifications
              <Icons.chevronRight className='size-3.5' />
            </Link>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
