'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Plan', href: 'plan', icon: 'plan' as const },
  { label: 'Review', href: 'review', icon: 'review' as const },
  { label: 'Collect', href: 'collect', icon: 'collect' as const },
  { label: 'Respondents', href: 'respondents', icon: 'users' as const },
  { label: 'Analytics', href: 'analytics', icon: 'analytics' as const },
  { label: 'Report', href: 'reports', icon: 'report' as const }
] as const;

export function SurveyPillNav({ surveyId }: { surveyId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/surveys/${surveyId}`;

  return (
    <div className='relative'>
      {/* Soft edge fades when the row scrolls on small screens */}
      <div
        className='pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white to-transparent md:hidden dark:from-card'
        aria-hidden
      />
      <div
        className='pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white to-transparent md:hidden dark:from-card'
        aria-hidden
      />

      <nav
        role='tablist'
        aria-label='Survey workflow'
        className={cn(
          'flex items-center gap-1 overflow-x-auto rounded-2xl border border-[color-mix(in_srgb,var(--brand)_28%,var(--border))]',
          'bg-white p-1 dark:bg-card',
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        )}
      >
        {TABS.map((tab, index) => {
          const href = `${base}/${tab.href}`;
          const Icon = Icons[tab.icon];
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={tab.href}
              href={href}
              role='tab'
              aria-selected={isActive}
              className={cn(
                'group relative inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-[color,background-color,box-shadow,border-color] duration-150',
                isActive
                  ? 'border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-card text-foreground shadow-sm'
                  : 'border border-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-bold tabular-nums transition-colors',
                  isActive
                    ? 'bg-brand text-brand-foreground'
                    : 'bg-muted text-muted-foreground group-hover:bg-brand-soft group-hover:text-foreground'
                )}
              >
                {index + 1}
              </span>

              {Icon ? (
                <Icon
                  className={cn(
                    'size-3.5 shrink-0 transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                  )}
                />
              ) : null}

              <span
                className={cn(
                  isActive && 'font-display font-bold tracking-tight'
                )}
              >
                {tab.label}
              </span>

              {isActive ? (
                <span
                  className='absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand md:inset-x-4'
                  aria-hidden
                />
              ) : null}
            </Link>
          );
        })}

        <Link
          href='/dashboard/surveys'
          aria-label='Back to all surveys'
          className={cn(
            'ml-auto inline-flex shrink-0 items-center gap-2 rounded-xl border border-black bg-black px-3 py-2',
            'text-sm font-medium whitespace-nowrap text-white transition-colors',
            'hover:bg-black/90 hover:text-white'
          )}
        >
          <Icons.forms className='size-3.5 shrink-0' />
          All surveys
        </Link>
      </nav>
    </div>
  );
}
