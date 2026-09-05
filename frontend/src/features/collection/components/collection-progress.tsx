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
    <div className={cn('rounded-xl border bg-background px-4 py-3', className)}>
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1'>
        <p className='text-xs font-medium'>
          Section{' '}
          <span className='text-primary'>
            {currentSectionIndex + 1} of {sections.length}
          </span>{' '}
          <span className='text-muted-foreground font-normal'>
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
          <span className='text-foreground ml-2 font-semibold'>{percent}%</span>
        </p>
      </div>

      {/* Overall progress bar */}
      <div className='bg-muted mt-2.5 h-1.5 w-full overflow-hidden rounded-full'>
        <div
          className='bg-primary h-full rounded-full transition-all duration-500 ease-out'
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Section steps */}
      <div className='mt-3 flex flex-wrap items-center gap-1.5'>
        {sections.map((section, i) => {
          const sectionAnswered = answeredCounts[i] ?? 0;
          const sectionRequired = requiredCounts[i] ?? 0;
          const isComplete =
            sectionRequired > 0
              ? sectionAnswered >= sectionRequired
              : sectionAnswered > 0;
          const isActive = i === currentSectionIndex;
          const isReachable = i <= currentSectionIndex;
          const Icon = isComplete ? Icons.check : null;

          const content = (
            <>
              <span
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full',
                  isComplete || isActive
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isComplete && Icon ? (
                  <Icon className='size-2.5' />
                ) : (
                  <span className='text-[9px] font-bold'>{i + 1}</span>
                )}
              </span>
              <span className='truncate'>{section.title}</span>
            </>
          );

          const chipClassName = cn(
            'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
            isActive
              ? 'border-primary/40 bg-primary/5 font-medium text-primary'
              : isComplete
                ? 'border-primary/25 text-primary hover:border-primary/50'
                : isReachable
                  ? 'border-border text-foreground hover:bg-muted/60'
                  : 'cursor-default border-border/60 text-muted-foreground/60'
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
            <span key={section.id} className={chipClassName} aria-current={isActive ? 'step' : undefined}>
              {content}
            </span>
          );
        })}
      </div>
    </div>
  );
}
