'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
  onNavigateToQuestion?: (questionId: string) => void;
  readOnly?: boolean;
}

export function FindingsList({
  findings,
  onFindingUpdate,
  onNavigateToQuestion,
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
        tone='brand'
        // icon={<Icons.review className='size-3.5' />}
        title='Findings'
        subtitle={`${counts.open} open · ${counts.accepted} accepted · ${counts.dismissed} dismissed`}
        badge={
          <span className='inline-flex min-w-6 items-center justify-center rounded-lg bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-primary-foreground'>
            {counts.all}
          </span>
        }
      />

      <SurvaiPanelBody className='space-y-3'>
        <div
          role='tablist'
          aria-label='Filter findings'
          className='flex flex-wrap gap-1'
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
                  'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {status}
                {status !== 'all' ? (
                  <span className='font-mono text-[10px] tabular-nums opacity-70'>
                    {counts[status]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className='flex flex-col items-center py-8 text-center'>
            <p className='text-sm font-medium text-foreground'>
              {filter === 'all' ? 'No findings detected' : `No ${filter} findings`}
            </p>
            <p className='text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed'>
              {filter === 'all'
                ? 'AI did not flag wording or alignment issues on this draft.'
                : 'Try another filter to see more findings.'}
            </p>
          </div>
        ) : (
          <ul className='divide-y divide-border overflow-hidden rounded-xl border border-border'>
            {filtered.map((finding) => (
              <li key={finding.id}>
                <FindingCard
                  finding={finding}
                  onUpdate={onFindingUpdate}
                  onNavigateToQuestion={onNavigateToQuestion}
                  readOnly={readOnly}
                />
              </li>
            ))}
          </ul>
        )}
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}

function FindingCard({
  finding,
  onUpdate,
  onNavigateToQuestion,
  readOnly = false
}: {
  finding: ReviewerFinding;
  onUpdate?: (finding: ReviewerFinding) => void;
  onNavigateToQuestion?: (questionId: string) => void;
  readOnly?: boolean;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const issueMeta = getIssueTypeMeta(finding.issueType);
  const canJump = Boolean(finding.questionId && onNavigateToQuestion);

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
        'space-y-2.5 bg-card px-3.5 py-3.5 transition-colors',
        finding.status === 'accepted' && 'bg-brand-soft/40',
        finding.status === 'dismissed' && 'opacity-60'
      )}
    >
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
        <span className='text-[11px] font-semibold text-foreground'>
          {issueMeta.label}
        </span>
        {finding.sectionTitle ? (
          <>
            <span className='text-border' aria-hidden>
              ·
            </span>
            <span className='text-[11px] text-muted-foreground'>
              {finding.sectionTitle}
            </span>
          </>
        ) : null}
        {finding.status !== 'open' ? (
          <span
            className={cn(
              'ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize',
              finding.status === 'accepted'
                ? 'bg-brand-soft text-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {finding.status}
          </span>
        ) : null}
      </div>

      <p className='text-sm leading-relaxed text-foreground'>
        {finding.explanation}
      </p>

      {finding.questionText || canJump ? (
        <div className='flex flex-wrap items-center gap-2'>
          {finding.questionText ? (
            <p className='min-w-0 flex-1 truncate text-xs italic text-muted-foreground'>
              &ldquo;{finding.questionText}&rdquo;
            </p>
          ) : null}
          {canJump ? (
            <button
              type='button'
              onClick={() => onNavigateToQuestion?.(finding.questionId!)}
              className='inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary hover:underline'
            >
              View question
              <Icons.arrowRight className='size-3' />
            </button>
          ) : null}
        </div>
      ) : null}

      {finding.suggestedRewrite ? (
        <div className='space-y-1.5'>
          <button
            type='button'
            onClick={() => setIsExpanded(!isExpanded)}
            className='inline-flex items-center gap-1 text-[11px] font-semibold text-foreground hover:underline'
          >
            {isExpanded ? (
              <Icons.chevronUp className='size-3' />
            ) : (
              <Icons.chevronDown className='size-3' />
            )}
            Suggested rewrite
          </button>
          {isExpanded ? (
            <p className='rounded-lg border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft/50 px-3 py-2 text-xs leading-relaxed text-foreground'>
              {finding.suggestedRewrite}
            </p>
          ) : null}
        </div>
      ) : null}

      {!readOnly && finding.status === 'open' ? (
        <div className='flex items-center gap-1.5 pt-0.5'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleStatusChange('accepted')}
            disabled={isUpdating}
            className='h-7 rounded-lg px-2.5 text-xs'
          >
            <Icons.check className='size-3' />
            Accept
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => handleStatusChange('dismissed')}
            disabled={isUpdating}
            className='h-7 rounded-lg px-2.5 text-xs text-muted-foreground'
          >
            Dismiss
          </Button>
        </div>
      ) : null}
      {!readOnly && finding.status !== 'open' ? (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => handleStatusChange('open')}
          disabled={isUpdating}
          className='h-7 rounded-lg px-2 text-xs text-muted-foreground'
        >
          Reopen
        </Button>
      ) : null}
    </div>
  );
}
