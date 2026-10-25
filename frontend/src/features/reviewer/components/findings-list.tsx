'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { ReviewerFinding, FindingStatus } from '../api/types';
import { getIssueTypeMeta } from '../api/types';
import { updateFindingStatus } from '../api/service';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';

interface FindingsListProps {
  findings: ReviewerFinding[];
  onFindingUpdate?: (finding: ReviewerFinding) => void;
  readOnly?: boolean;
}

export function FindingsList({
  findings,
  onFindingUpdate,
  readOnly = false
}: FindingsListProps) {
  const [filter, setFilter] = useState<FindingStatus | 'all'>('all');

  const filtered = findings.filter(
    (f) => filter === 'all' || f.status === filter
  );

  const counts = {
    all: findings.length,
    open: findings.filter((f) => f.status === 'open').length,
    accepted: findings.filter((f) => f.status === 'accepted').length,
    dismissed: findings.filter((f) => f.status === 'dismissed').length
  };

  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        icon={<Icons.review className='size-3.5' />}
        title='Findings'
        subtitle={`${counts.open} open · ${counts.accepted} accepted · ${counts.dismissed} dismissed`}
        badge={
          <Badge
            variant='secondary'
            className='rounded-full border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft font-mono text-[10px] font-semibold tabular-nums text-foreground'
          >
            {counts.all}
          </Badge>
        }
      />

      <SurvaiPanelBody className='space-y-4'>
        <div
          role='tablist'
          aria-label='Filter findings'
          className='bg-secondary/80 flex flex-wrap gap-1 rounded-2xl border border-border p-1'
        >
          {(['all', 'open', 'accepted', 'dismissed'] as const).map((status) => {
            const active = filter === status;
            return (
              <button
                key={status}
                type='button'
                role='tab'
                aria-selected={active}
                onClick={() => setFilter(status)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  active
                    ? 'border border-[color-mix(in_srgb,var(--brand)_50%,var(--border))] bg-card text-foreground shadow-sm'
                    : 'border border-transparent text-muted-foreground hover:bg-card/80 hover:text-foreground'
                )}
              >
                {status}
                {status !== 'all' ? (
                  <span className='ml-1 font-mono text-[10px] tabular-nums opacity-70'>
                    {counts[status]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className='flex flex-col items-center py-10 text-center'>
            <div className='mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft'>
              <Icons.circleCheck className='size-5 text-foreground' />
            </div>
            <p className='font-display text-sm font-bold tracking-tight'>
              {filter === 'all' ? 'No findings detected' : `No ${filter} findings`}
            </p>
            <p className='text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed'>
              {filter === 'all'
                ? 'AI did not flag wording or alignment issues on this draft.'
                : 'Try another filter to see more findings.'}
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {filtered.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onUpdate={onFindingUpdate}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}

function FindingCard({
  finding,
  onUpdate,
  readOnly = false
}: {
  finding: ReviewerFinding;
  onUpdate?: (finding: ReviewerFinding) => void;
  readOnly?: boolean;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const issueMeta = getIssueTypeMeta(finding.issueType);

  const handleStatusChange = useCallback(
    async (status: FindingStatus) => {
      if (readOnly || !onUpdate) return;
      setIsUpdating(true);
      try {
        const updated = await updateFindingStatus(finding.id, status);
        if (updated) {
          onUpdate(updated);
          toast.success(
            status === 'accepted'
              ? 'Finding accepted'
              : status === 'dismissed'
                ? 'Finding dismissed'
                : 'Finding reopened'
          );
        }
      } catch {
        toast.error('Failed to update finding');
      } finally {
        setIsUpdating(false);
      }
    },
    [finding.id, onUpdate, readOnly]
  );

  return (
    <div
      className={cn(
        'space-y-2.5 rounded-xl border border-border bg-card px-3.5 py-3 transition-colors',
        finding.status === 'accepted' &&
          'border-[color-mix(in_srgb,var(--brand)_50%,var(--border))] bg-brand-soft/45',
        finding.status === 'dismissed' && 'opacity-55'
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span
            className={cn(
              'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              issueMeta.color,
              'border-current/20 bg-current/5'
            )}
          >
            {issueMeta.label}
          </span>
          {finding.sectionTitle ? (
            <Badge
              variant='outline'
              className='rounded-full border-border text-[10px]'
            >
              {finding.sectionTitle}
            </Badge>
          ) : null}
        </div>
        {finding.status !== 'open' ? (
          <Badge
            variant='secondary'
            className={cn(
              'rounded-full text-[10px] font-semibold capitalize',
              finding.status === 'accepted' &&
                'border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft text-foreground'
            )}
          >
            {finding.status}
          </Badge>
        ) : null}
      </div>

      {finding.questionText ? (
        <p className='text-muted-foreground rounded-lg bg-secondary/60 px-2.5 py-1.5 text-xs leading-relaxed italic'>
          &ldquo;{finding.questionText}&rdquo;
        </p>
      ) : null}

      <p className='text-sm leading-relaxed text-foreground'>
        {finding.explanation}
      </p>

      {finding.suggestedRewrite ? (
        <button
          type='button'
          onClick={() => setIsExpanded(!isExpanded)}
          className='text-foreground inline-flex items-center gap-1 text-xs font-semibold hover:underline'
        >
          {isExpanded ? (
            <Icons.chevronUp className='size-3' />
          ) : (
            <Icons.chevronDown className='size-3' />
          )}
          Suggested improvement
        </button>
      ) : null}

      {isExpanded && finding.suggestedRewrite ? (
        <div className='rounded-xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-brand-soft/60 p-3 text-xs leading-relaxed'>
          <p className='text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase'>
            Suggested rewrite
          </p>
          <p className='font-medium text-foreground'>
            {finding.suggestedRewrite}
          </p>
        </div>
      ) : null}

      {!readOnly && finding.status === 'open' ? (
        <>
          <Separator />
          <div className='bg-secondary/70 flex items-center gap-1 rounded-xl border border-border p-1'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleStatusChange('accepted')}
              disabled={isUpdating}
              className='h-7 flex-1 rounded-lg text-xs hover:bg-brand-soft'
            >
              <Icons.check className='size-3' />
              Accept
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleStatusChange('dismissed')}
              disabled={isUpdating}
              className='h-7 flex-1 rounded-lg text-xs hover:bg-card'
            >
              <Icons.close className='size-3' />
              Dismiss
            </Button>
          </div>
        </>
      ) : null}
      {!readOnly && finding.status !== 'open' ? (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => handleStatusChange('open')}
          disabled={isUpdating}
          className='h-7 rounded-lg px-2 text-xs'
        >
          Reopen
        </Button>
      ) : null}
    </div>
  );
}
