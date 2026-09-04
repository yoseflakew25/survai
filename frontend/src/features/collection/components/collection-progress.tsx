'use client';

import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

interface CollectionProgressProps {
  sections: { id: string; title: string }[];
  currentSectionIndex: number;
  answeredCounts: number[];
  requiredCounts: number[];
  className?: string;
}

export function CollectionProgress({
  sections,
  currentSectionIndex,
  answeredCounts,
  requiredCounts,
  className
}: CollectionProgressProps) {
  const totalRequired = requiredCounts.reduce((a, b) => a + b, 0);
  const totalAnswered = answeredCounts.reduce((a, b) => a + b, 0);
  const percent = totalRequired > 0 ? Math.round((totalAnswered / totalRequired) * 100) : 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Overall progress */}
      <div >
        <div className='flex items-center justify-between text-xs'>
          <span className='text-muted-foreground'>
            {totalAnswered} of {totalRequired} required questions answered
          </span>
          <span className='font-medium'>{percent}%</span>
        </div>
        <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
          <div
            className='bg-primary h-full rounded-full transition-all duration-500 ease-out'
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Section indicators */}
      <div className='flex gap-1'>
        {sections.map((section, i) => {
          const sectionAnswered = answeredCounts[i] ?? 0;
          const sectionRequired = requiredCounts[i] ?? 0;
          const isComplete = sectionRequired > 0 && sectionAnswered >= sectionRequired;
          const isActive = i === currentSectionIndex;

          return (
            <div
              key={section.id}
              className='flex-1 space-y-1'
            >
              <div className='flex items-center gap-1'>
                <div
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium',
                    isComplete
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'bg-primary/20 text-primary ring-2 ring-primary/30'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete ? (
                    <Icons.check className='h-3 w-3' />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    'truncate text-[10px]',
                    isActive
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  )}
                >
                  {section.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
