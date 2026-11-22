'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const TABS = [
  { labelKey: 'tabPlan' as const, href: 'plan', icon: 'plan' as const },
  { labelKey: 'tabReview' as const, href: 'review', icon: 'review' as const },
  { labelKey: 'tabCollect' as const, href: 'collect', icon: 'collect' as const },
  {
    labelKey: 'tabRespondents' as const,
    href: 'respondents',
    icon: 'users' as const
  },
  {
    labelKey: 'tabAnalytics' as const,
    href: 'analytics',
    icon: 'analytics' as const
  },
  { labelKey: 'tabReport' as const, href: 'reports', icon: 'report' as const }
] as const;

export function SurveyPillNav({ surveyId }: { surveyId: string }) {
  const pathname = usePathname();
  const t = useTranslations('surveys');
  const base = `/dashboard/surveys/${surveyId}`;

  return (
    <div className='relative'>
      <div
        className='pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background to-transparent md:hidden'
        aria-hidden
      />
      <div
        className='pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background to-transparent md:hidden'
        aria-hidden
      />

      <nav
        aria-label={t('workflowAria')}
        className={cn(
          'flex items-center gap-0 overflow-x-auto rounded-none border border-foreground/15',
          'bg-background p-0',
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
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative inline-flex shrink-0 items-center gap-2 border-r border-foreground/[0.08] px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-[color,background-color] duration-150 last:border-r-0',
                isActive
                  ? 'bg-[color-mix(in_srgb,var(--brand)_38%,var(--background))] text-foreground'
                  : 'text-muted-foreground hover:bg-brand-soft/50 hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-none border border-foreground/15 font-mono text-xs font-bold tabular-nums transition-colors',
                  isActive
                    ? 'border-foreground/25 bg-primary text-primary-foreground'
                    : 'bg-transparent text-muted-foreground group-hover:text-foreground'
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
                {t(tab.labelKey)}
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
          aria-label={t('backToAllAria')}
          className={cn(
            'ml-auto inline-flex shrink-0 items-center gap-2 rounded-none border border-foreground bg-foreground px-3 py-2',
            'text-sm font-medium whitespace-nowrap text-background transition-colors',
            'hover:bg-foreground/90 hover:text-background'
          )}
        >
          <Icons.forms className='size-3.5 shrink-0' />
          {t('allSurveys')}
        </Link>
      </nav>
    </div>
  );
}
