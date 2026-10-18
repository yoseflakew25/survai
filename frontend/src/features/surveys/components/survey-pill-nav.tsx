'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Plan', href: 'plan', icon: 'plan' as const },
  { label: 'Review', href: 'review', icon: 'review' as const },
  { label: 'Collect', href: 'collect', icon: 'collect' as const },
  { label: 'Analytics', href: 'analytics', icon: 'analytics' as const },
  { label: 'Report', href: 'reports', icon: 'report' as const }
];

export function SurveyPillNav({ surveyId }: { surveyId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/surveys/${surveyId}`;

  return (
    <nav
      role='tablist'
      aria-label='Survey sections'
      className='flex flex-wrap gap-1 rounded-full bg-secondary p-1'
    >
      {TABS.map((tab) => {
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
              'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {Icon ? <Icon className='size-3.5' /> : null}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
