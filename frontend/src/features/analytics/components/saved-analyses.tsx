'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { Filter, SavedAnalysis } from '../api/types';

interface SavedAnalysesProps {
  analyses: SavedAnalysis[];
  activeFilters: Filter[];
  activeAnalysisId: string | null;
  canEdit: boolean;
  saving?: boolean;
  onApply: (analysis: SavedAnalysis) => void;
  onClear: () => void;
  onSave: (name: string) => Promise<void> | void;
}

export function SavedAnalyses({
  analyses,
  activeFilters,
  activeAnalysisId,
  canEdit,
  saving = false,
  onApply,
  onClear,
  onSave
}: SavedAnalysesProps) {
  const [name, setName] = useState('');

  return (
    <div className='rounded-lg border bg-background p-4'>
      <div className='mb-3'>
        <h3 className='text-md font-semibold text-primary'>Saved views</h3>
        <p className='text-muted-foreground text-xs'>
          Named filters for analytics, reports, and reuse
        </p>
      </div>

      {activeFilters.length > 0 ? (
        <div className='mb-3 flex flex-wrap items-center gap-1.5'>
          {activeFilters.map((f) => (
            <span
              key={`${f.questionId}-${f.op}-${String(f.value)}`}
              className='rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px]'
            >
              {f.op} {String(f.value)}
            </span>
          ))}
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-6 px-2 text-[10px]'
            onClick={onClear}
          >
            Clear
          </Button>
        </div>
      ) : (
        <p className='text-muted-foreground mb-3 text-xs'>
          No active filters. Click a distribution bar or save after filtering.
        </p>
      )}

      {canEdit ? (
        <form
          className='mb-3 flex gap-2'
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed || saving) return;
            void (async () => {
              await onSave(trimmed);
              setName('');
            })();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Name this view…'
            className='h-9 text-xs'
          />
          <Button
            type='submit'
            size='sm'
            className='h-9 shrink-0 rounded-xl'
            disabled={saving || !name.trim()}
          >
            {saving ? (
              <Icons.spinner className='size-3.5 animate-spin' />
            ) : (
              'Save'
            )}
          </Button>
        </form>
      ) : null}

      {analyses.length === 0 ? (
        <div className='flex flex-col items-center py-4 text-center'>
          <Icons.analytics className='text-muted-foreground/30 mb-2 h-8 w-8' />
          <p className='text-muted-foreground text-sm'>No saved views yet</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {analyses.map((analysis) => {
            const isActive = activeAnalysisId === analysis.id;
            return (
              <button
                key={analysis.id}
                type='button'
                onClick={() => onApply(analysis)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  isActive
                    ? 'border-foreground/30 bg-muted/50'
                    : 'hover:bg-muted/50'
                )}
              >
                <div className='bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-md'>
                  <Icons.analytics className='text-primary size-4' />
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-primary'>
                    {analysis.name}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {new Date(analysis.createdAt).toLocaleDateString()} ·{' '}
                    {analysis.filters.length} filter
                    {analysis.filters.length === 1 ? '' : 's'}
                  </p>
                </div>
                {isActive ? (
                  <Icons.check className='text-foreground size-3.5 shrink-0' />
                ) : (
                  <Icons.chevronRight className='text-muted-foreground size-3.5 shrink-0' />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
