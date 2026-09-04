'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { SavedAnalysis } from '../api/types';

interface SavedAnalysesProps {
  analyses: SavedAnalysis[];
}

export function SavedAnalyses({ analyses }: SavedAnalysesProps) {
  return (
    <div className='rounded-lg border bg-background p-4'>
      <div className='mb-3'>
        <h3 className='text-md font-semibold text-primary'>Saved Analyses</h3>
        <p className='text-muted-foreground text-xs'>Reusable chart configurations</p>
      </div>
      {analyses.length === 0 ? (
        <div className='flex flex-col items-center py-6 text-center'>
          <Icons.analytics className='text-muted-foreground/30 mb-2 h-8 w-8' />
          <p className='text-muted-foreground text-sm'>No saved analyses yet</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {analyses.map((analysis) => {
            const chartType = (analysis.chartConfig?.type as string) ?? 'bar';
            return (
              <div
                key={analysis.id}
                className='flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50'
              >
                <div className='bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-md'>
                  {chartType === 'crosstab' ? (
                    <Icons.analytics className='text-primary size-4' />
                  ) : (
                    <Icons.trendingUp className='text-primary size-4' />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-primary'>{analysis.name}</p>
                  <p className='text-muted-foreground text-xs'>
                    {new Date(analysis.createdAt).toLocaleDateString()} ·{' '}
                    {chartType === 'crosstab' ? 'Cross-tab' : 'Bar chart'}
                  </p>
                </div>
                <Button variant='ghost' size='icon-sm'>
                  <Icons.externalLink className='h-3.5 w-3.5' />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
