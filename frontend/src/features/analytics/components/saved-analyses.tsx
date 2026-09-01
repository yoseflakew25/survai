'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { SavedAnalysis } from '../api/types';

interface SavedAnalysesProps {
  analyses: SavedAnalysis[];
}

export function SavedAnalyses({ analyses }: SavedAnalysesProps) {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <CardTitle className='text-base'>Saved Analyses</CardTitle>
            <CardDescription>
              Reusable chart configurations
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        {analyses.length === 0 ? (
          <div className='flex flex-col items-center py-6 text-center'>
            <Icons.analytics className='text-muted-foreground/30 mb-2 h-8 w-8' />
            <p className='text-muted-foreground text-sm'>
              No saved analyses yet
            </p>
          </div>
        ) : (
          analyses.map((analysis) => {
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
                  <p className='truncate text-sm font-medium'>
                    {analysis.name}
                  </p>
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
          })
        )}
      </CardContent>
    </Card>
  );
}
