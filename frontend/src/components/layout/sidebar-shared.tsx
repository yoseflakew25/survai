'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { SurvaiLogo, SurvaiMark } from '@/components/survai-logo';
import { SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

/** True when pathname is the href or a nested child route under it. */
export function isNavActive(pathname: string, href: string): boolean {
  if (!href || href === '#') return false;
  if (pathname === href) return true;
  const base = href.endsWith('/') ? href.slice(0, -1) : href;
  return pathname.startsWith(`${base}/`);
}

/** Uppercase two-letter initials for square sidebar avatars. */
export function getUserInitials(name?: string | null, fallback = 'U'): string {
  return (
    name
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || fallback
  );
}

/** Brand header lockup aligned to the 60px top header hairline. */
export function SidebarBrandHeader({
  href,
  ariaLabel,
  badge
}: {
  href: string;
  ariaLabel: string;
  badge?: string;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <SidebarHeader>
      <Link
        href={href}
        aria-label={ariaLabel}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-none px-1.5 transition-colors hover:bg-brand-soft/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          isCollapsed && 'size-10 justify-center px-0'
        )}
      >
        {isCollapsed ? (
          <SurvaiMark className='size-8 shrink-0' />
        ) : (
          <>
            <SurvaiLogo className='text-[1.65rem] font-bold leading-none tracking-[-0.06em] text-foreground' />
            {badge ? (
              <span className='ml-auto rounded-none border border-foreground/20 bg-brand px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-brand-foreground'>
                {badge}
              </span>
            ) : null}
          </>
        )}
      </Link>
    </SidebarHeader>
  );
}

/** Editorial square icon slot matching SurvaiRailRow and SurveyPillNav. */
export function SidebarNavIcon({
  icon: IconComponent,
  isActive
}: {
  icon: ComponentType<React.SVGProps<SVGSVGElement>> | null;
  isActive: boolean;
}) {
  if (!IconComponent) return null;

  return (
    <span
      aria-hidden
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-none border transition-colors',
        'group-data-[collapsible=icon]:size-auto group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-current',
        isActive
          ? 'border-primary bg-primary text-primary-foreground dark:border-brand dark:bg-brand dark:text-brand-foreground'
          : 'border-foreground/15 bg-muted/40 text-muted-foreground group-hover/menu-button:border-foreground/25 group-hover/menu-button:bg-background group-hover/menu-button:text-foreground'
      )}
    >
      <IconComponent className='size-3.5 group-data-[collapsible=icon]:size-4' />
    </span>
  );
}

/** Active left edge accent strip for expanded sidebar items. */
export function SidebarActiveBar({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  return (
    <span
      aria-hidden
      className='absolute inset-y-0 left-0 w-[3px] bg-primary dark:bg-brand group-data-[collapsible=icon]:hidden'
    />
  );
}

/** Square monogram avatar consistent with Survai's 0px-radius chrome. */
export function SidebarUserAvatar({
  name,
  fallback = 'U',
  size = 'sm'
}: {
  name?: string | null;
  fallback?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <Avatar
      className={cn(
        'shrink-0 rounded-none border border-foreground/20 after:rounded-none after:border-0',
        size === 'md' ? 'size-9' : 'size-8'
      )}
    >
      <AvatarFallback
        className={cn(
          'rounded-none bg-primary font-mono font-bold text-primary-foreground dark:bg-brand dark:text-brand-foreground',
          size === 'md' ? 'text-xs' : 'text-[11px]'
        )}
      >
        {getUserInitials(name, fallback)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Class for the bordered user footer trigger button. */
export const sidebarUserTriggerClass =
  'h-auto min-h-12 w-full rounded-none border border-foreground/15 bg-brand-soft/40 px-2 py-2 text-foreground hover:border-foreground/30 hover:bg-brand-soft/75 data-popup-open:border-foreground/30 data-popup-open:bg-brand-soft/75 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:hover:border-foreground/15 group-data-[collapsible=icon]:hover:bg-brand-soft/60';

/** Expanded label + email + selector icon inside the footer trigger. */
export function SidebarUserTriggerMeta({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div className='min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden'>
        <span className='block truncate text-sm font-semibold tracking-tight text-foreground'>
          {title}
        </span>
        <span className='block truncate font-mono text-[11px] text-muted-foreground'>
          {subtitle}
        </span>
      </div>
      <Icons.selector className='size-4 shrink-0 text-muted-foreground/80 group-data-[collapsible=icon]:hidden' />
    </>
  );
}
