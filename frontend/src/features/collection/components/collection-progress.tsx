'use client';

import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

interface CollectionProgressProps {
  sections: { id: string; title: string }[];
  currentSectionIndex: number;
  answeredCounts: number[];
  requiredCounts: number[];
  /** Jump to an earlier section (index must be <= currentSectionIndex) */
  onSelectSection?: (index: number) => void;
  className?: string;
}

export function CollectionProgress({
  sections,
  currentSectionIndex,
  answeredCounts,
  requiredCounts,
  onSelectSection,
  className
}: CollectionProgressProps) {
  const totalRequired = requiredCounts.reduce((a, b) => a + b, 0);
  const totalAnswered = answeredCounts.reduce((a, b) => a + b, 0);
  const percent =
    totalRequired > 0
      ? Math.round(Math.min(1, totalAnswered / totalRequired) * 100)
      : 0;
  const currentTitle = sections[currentSectionIndex]?.title ?? '';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
        className
      )}
    >
      <div className='flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-3.5 pb-3 sm:px-5'>
        <div className='min-w-0 space-y-0.5'>
          <p className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
            Section{' '}
            <span className='font-mono tabular-nums text-foreground'>
              {currentSectionIndex + 1}
            </span>
            <span className='text-muted-foreground font-normal normal-case tracking-normal'>
              {' '}
              of {sections.length}
            </span>
          </p>
          <p className='truncate text-sm font-semibold tracking-tight text-foreground'>
            {currentTitle}
          </p>
        </div>
        <div className='shrink-0 text-right'>
          <p className='font-display text-lg font-extrabold tracking-tight tabular-nums text-foreground'>
            {percent}%
          </p>
          <p className='text-muted-foreground text-[11px] tabular-nums'>
            {totalRequired > 0
              ? `${Math.min(totalAnswered, totalRequired)} of ${totalRequired} required`
              : `${totalAnswered} answered`}
          </p>
        </div>
      </div>

      <div className='px-4 sm:px-5'>
        <div className='h-1.5 w-full overflow-hidden rounded-full bg-secondary'>
          <div
            className='h-full rounded-full bg-brand transition-all duration-500 ease-out'
            style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>

      <nav
        aria-label='Survey sections'
        className='mt-3 flex gap-1.5 overflow-x-auto px-3 pb-3.5 sm:px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      >
        {sections.map((section, i) => {
          const sectionAnswered = answeredCounts[i] ?? 0;
          const sectionRequired = requiredCounts[i] ?? 0;
          const isComplete =
            sectionRequired > 0
              ? sectionAnswered >= sectionRequired
              : sectionAnswered > 0;
          const isActive = i === currentSectionIndex;
          const isReachable = i <= currentSectionIndex;

          const content = (
            <>
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums',
                  isActive &&
                    'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)]',
                  !isActive &&
                    isComplete &&
                    'bg-foreground text-background',
                  !isActive &&
                    !isComplete &&
                    'border border-border bg-white text-muted-foreground'
                )}
              >
                {isComplete && !isActive ? (
                  <Icons.check className='size-3' />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  'max-w-[10rem] truncate sm:max-w-[14rem]',
                  isActive ? 'font-semibold' : 'font-medium'
                )}
              >
                {section.title}
              </span>
            </>
          );

          const chipClassName = cn(
            'inline-flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] transition-colors',
            isActive &&
              'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_8%,transparent)]',
            !isActive &&
              isComplete &&
              'border border-border bg-white text-foreground hover:bg-secondary/60',
            !isActive &&
              !isComplete &&
              isReachable &&
              'border border-transparent text-foreground/80 hover:border-border hover:bg-white',
            !isReachable &&
              'cursor-default border border-transparent text-muted-foreground/50'
          );

          return isReachable && onSelectSection ? (
            <button
              key={section.id}
              type='button'
              onClick={() => i !== currentSectionIndex && onSelectSection(i)}
              className={chipClassName}
              aria-current={isActive ? 'step' : undefined}
            >
              {content}
            </button>
          ) : (
            <span
              key={section.id}
              className={chipClassName}
              aria-current={isActive ? 'step' : undefined}
            >
              {content}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
