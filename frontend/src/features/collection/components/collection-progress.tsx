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

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm',
        className
      )}
    >
      <div className='flex flex-wrap items-end justify-between gap-x-4 gap-y-1'>
        <p className='text-sm font-medium text-foreground'>
          Section{' '}
          <span className='font-mono text-[13px] font-semibold tabular-nums'>
            {currentSectionIndex + 1}
            <span className='text-muted-foreground font-normal'>
              {' '}
              of {sections.length}
            </span>
          </span>
          <span className='text-muted-foreground font-normal'>
            {' '}
            — {sections[currentSectionIndex]?.title}
          </span>
        </p>
        <p className='text-muted-foreground text-xs tabular-nums'>
          {totalRequired > 0 ? (
            <>
              {Math.min(totalAnswered, totalRequired)} of {totalRequired} required
              answered
            </>
          ) : (
            `${totalAnswered} answered`
          )}
          <span className='ml-2 font-mono text-sm font-semibold text-foreground'>
            {percent}%
          </span>
        </p>
      </div>

      <div className='mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary'>
        <div
          className='h-full rounded-full bg-brand transition-all duration-500 ease-out'
          style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
        />
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-1.5 rounded-full bg-secondary/80 p-1'>
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
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  isActive &&
                    'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-brand-foreground',
                  !isActive &&
                    isComplete &&
                    'bg-foreground text-background',
                  !isActive &&
                    !isComplete &&
                    'bg-muted text-muted-foreground'
                )}
              >
                {isComplete && !isActive ? (
                  <Icons.check className='size-3' />
                ) : (
                  i + 1
                )}
              </span>
              <span className='truncate'>{section.title}</span>
            </>
          );

          const chipClassName = cn(
            'inline-flex max-w-full items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] transition-colors',
            isActive &&
              'bg-card font-semibold text-foreground shadow-sm ring-1 ring-border',
            !isActive &&
              isComplete &&
              'font-medium text-foreground hover:bg-card/70',
            !isActive &&
              !isComplete &&
              isReachable &&
              'text-foreground/80 hover:bg-card/50',
            !isReachable && 'cursor-default text-muted-foreground/55'
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
      </div>
    </div>
  );
}
