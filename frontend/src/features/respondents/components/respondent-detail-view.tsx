'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { respondentDetailOptions } from '../api/queries';
import type { RespondentAnswer } from '../api/types';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';

interface RespondentDetailViewProps {
  surveyId: string;
  respondentId: string;
  /** Drawer layout drops the side summary and stacks answers full-width. */
  variant?: 'page' | 'drawer';
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return (
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) +
    ' · ' +
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function RespondentDetailView({
  surveyId,
  respondentId,
  variant = 'page'
}: RespondentDetailViewProps) {
  const { data: detail } = useSuspenseQuery(
    respondentDetailOptions(surveyId, respondentId)
  );

  if (!detail) {
    notFound();
  }

  const groups: { title: string; answers: RespondentAnswer[] }[] = [];
  for (const answer of detail.answers) {
    const last = groups[groups.length - 1];
    if (last && last.title === answer.sectionTitle) {
      last.answers.push(answer);
    } else {
      groups.push({ title: answer.sectionTitle, answers: [answer] });
    }
  }

  const answeredCount = detail.answers.filter((a) => a.answered).length;
  const totalQuestions = detail.answers.length;
  const completionPct =
    totalQuestions > 0
      ? Math.round((answeredCount / totalQuestions) * 100)
      : 0;
  const isComplete = detail.status === 'completed';
  const isDrawer = variant === 'drawer';

  const answersList = (
    <div className={cn('flex min-w-0 flex-col', isDrawer ? 'gap-3' : 'gap-4')}>
      {groups.length === 0 ? (
        <SurvaiPanel>
          <SurvaiPanelBody className='flex flex-col items-center py-12 text-center'>
            <div className='mb-3 flex size-11 items-center justify-center rounded-xl bg-brand-soft text-foreground'>
              <Icons.forms className='size-5' />
            </div>
            <p className='font-display font-bold tracking-tight'>
              No answers recorded
            </p>
            <p className='text-muted-foreground mt-1 max-w-sm text-sm'>
              This submission did not include any question responses.
            </p>
          </SurvaiPanelBody>
        </SurvaiPanel>
      ) : (
        groups.map((group, groupIdx) => (
          <SectionCard
            key={group.title}
            index={groupIdx + 1}
            title={group.title}
            answered={group.answers.filter((a) => a.answered).length}
            total={group.answers.length}
            compact={isDrawer}
          >
            {group.answers.map((answer, answerIdx) => (
              <AnsweredQuestion
                key={answer.questionId}
                answer={answer}
                questionNumber={answerIdx + 1}
                isLast={answerIdx === group.answers.length - 1}
                stacked={isDrawer}
              />
            ))}
          </SectionCard>
        ))
      )}
    </div>
  );

  if (isDrawer) {
    return (
      <div className='flex flex-col'>
        <header className='relative overflow-hidden border-b border-border bg-card'>
          <div
            className='pointer-events-none absolute inset-0 opacity-70'
            style={{
              backgroundImage:
                'radial-gradient(ellipse 80% 120% at 0% 0%, color-mix(in srgb, var(--brand) 28%, transparent), transparent 55%)'
            }}
          />
          <div className='relative px-4 pt-4 pr-12 pb-3 sm:px-5'>
            <div className='flex items-center gap-3'>
              <div className='flex size-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand font-mono text-xs font-bold tracking-wide text-brand-foreground uppercase shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)]'>
                {initialsFromName(detail.name)}
              </div>

              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                  <h1 className='font-display truncate text-lg font-extrabold tracking-tight text-foreground'>
                    {detail.name}
                  </h1>
                  <Badge
                    className={cn(
                      'rounded-full border-transparent text-[10px] font-semibold',
                      isComplete
                        ? 'bg-foreground text-background'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    {isComplete ? (
                      <Icons.circleCheck className='mr-1 size-3' />
                    ) : (
                      <Icons.clock className='mr-1 size-3' />
                    )}
                    {isComplete ? 'Completed' : 'Partial'}
                  </Badge>
                </div>
                <p className='text-muted-foreground mt-0.5 truncate text-xs'>
                  {detail.email}
                  <span className='mx-1.5 text-border'>·</span>
                  <span className='text-foreground/75'>{detail.surveyTitle}</span>
                </p>
              </div>
            </div>

            <dl className='mt-3 grid grid-cols-3 gap-2'>
              <MetaStat
                icon={<Icons.calendar className='size-3' />}
                label='Submitted'
                value={formatDateTime(detail.submittedAt)}
              />
              <MetaStat
                icon={<Icons.clock className='size-3' />}
                label='Duration'
                value={formatDuration(detail.durationSeconds)}
                mono
              />
              <MetaStat
                icon={<Icons.check className='size-3' />}
                label='Answered'
                value={`${answeredCount}/${totalQuestions}`}
                mono
              />
            </dl>
          </div>

          <div className='relative flex items-center gap-3 border-t border-border/70 bg-muted/40 px-4 py-2 sm:px-5'>
            <span className='text-muted-foreground shrink-0 text-[11px] font-medium'>
              Completion
            </span>
            <div className='h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary'>
              <div
                className='h-full rounded-full bg-brand transition-[width] duration-500 ease-out'
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className='shrink-0 font-mono text-[11px] font-semibold tabular-nums text-foreground'>
              {completionPct}%
            </span>
          </div>
        </header>

        <div className='space-y-3 px-4 py-4 sm:px-5'>{answersList}</div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-6 pb-8'>
      <header className='flex items-start gap-3'>
        <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-mono text-xs font-bold tracking-wide text-foreground uppercase'>
          {initialsFromName(detail.name)}
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <h1 className='font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl'>
              {detail.name}
            </h1>
            <Badge
              className={cn(
                'rounded-full border-transparent text-[10px] font-semibold',
                isComplete
                  ? 'bg-brand text-brand-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {isComplete ? (
                <Icons.circleCheck className='mr-1 size-3' />
              ) : (
                <Icons.clock className='mr-1 size-3' />
              )}
              {isComplete ? 'Completed' : 'Partial'}
            </Badge>
          </div>

          <p className='text-muted-foreground mt-0.5 truncate text-sm'>
            {detail.email}
            <span className='mx-1.5 text-border'>·</span>
            <span className='text-foreground/70'>{detail.surveyTitle}</span>
          </p>

          <dl className='mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs'>
            <div className='flex items-center gap-1.5'>
              <Icons.calendar className='text-muted-foreground size-3.5 shrink-0' />
              <dt className='sr-only'>Submitted</dt>
              <dd className='text-foreground'>
                {formatDateTime(detail.submittedAt)}
              </dd>
            </div>
            <span className='bg-border hidden h-3 w-px sm:block' aria-hidden />
            <div className='flex items-center gap-1.5'>
              <Icons.clock className='text-muted-foreground size-3.5 shrink-0' />
              <dt className='sr-only'>Duration</dt>
              <dd className='font-mono tabular-nums text-foreground'>
                {formatDuration(detail.durationSeconds)}
              </dd>
            </div>
            <span className='bg-border hidden h-3 w-px sm:block' aria-hidden />
            <div className='flex items-center gap-1.5'>
              <Icons.check className='text-muted-foreground size-3.5 shrink-0' />
              <dt className='sr-only'>Answered</dt>
              <dd className='font-mono tabular-nums text-foreground'>
                {answeredCount}/{totalQuestions} answered
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {answersList}
    </div>
  );
}

function MetaStat({
  icon,
  label,
  value,
  mono
}: {
  icon: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className='min-w-0 rounded-xl border border-border bg-background/85 px-2.5 py-2 shadow-sm backdrop-blur-sm'>
      <dt className='text-muted-foreground flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase'>
        <span className='shrink-0'>{icon}</span>
        <span className='truncate'>{label}</span>
      </dt>
      <dd
        className={cn(
          'mt-0.5 truncate text-xs font-semibold text-foreground',
          mono && 'font-mono tabular-nums'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function SectionCard({
  index,
  title,
  answered,
  total,
  children,
  compact
}: {
  index: number;
  title: string;
  answered: number;
  total: number;
  children: ReactNode;
  compact?: boolean;
}) {
  const complete = answered === total;

  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        className={compact ? 'px-3.5 py-2.5' : undefined}
        icon={
          <span className='font-mono text-[11px] font-bold tabular-nums'>
            {index}
          </span>
        }
        title={title}
        badge={
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums',
              complete
                ? 'bg-brand-soft text-foreground'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            {answered}/{total}
          </span>
        }
      />
      <div>{children}</div>
    </SurvaiPanel>
  );
}

function AnsweredQuestion({
  answer,
  questionNumber,
  isLast,
  stacked
}: {
  answer: RespondentAnswer;
  questionNumber: number;
  isLast: boolean;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid gap-1.5 px-3.5 py-3',
        !stacked &&
          'sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] sm:items-start sm:gap-6 sm:px-4 sm:py-3.5',
        !isLast && 'border-b border-border',
        !answer.answered && 'bg-muted/25'
      )}
    >
      <div className='flex min-w-0 gap-2'>
        <span className='text-muted-foreground w-4 shrink-0 pt-0.5 text-right font-mono text-[11px] font-semibold tabular-nums'>
          {questionNumber}
        </span>
        <div className='min-w-0'>
          <p className='text-sm leading-snug font-medium text-foreground'>
            {answer.promptText}
          </p>
          {answer.helpText ? (
            <p className='text-muted-foreground mt-0.5 text-xs'>
              {answer.helpText}
            </p>
          ) : null}
        </div>
      </div>

      <div className={cn('min-w-0', stacked ? 'pl-6' : 'pl-6 sm:pl-0 sm:pt-0.5')}>
        {renderAnswerValue(answer)}
      </div>
    </div>
  );
}

function renderAnswerValue(answer: RespondentAnswer): ReactNode {
  if (!answer.answered || answer.value === null) {
    return (
      <span className='inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-muted-foreground'>
        <Icons.minus className='size-3 opacity-60' />
        No answer
      </span>
    );
  }

  if (Array.isArray(answer.value)) {
    return (
      <div className='flex flex-wrap gap-1.5'>
        {answer.value.map((label) => (
          <span
            key={label}
            className='inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft px-2 py-0.5 text-xs font-medium text-foreground'
          >
            <Icons.check className='size-3 shrink-0' />
            {label}
          </span>
        ))}
      </div>
    );
  }

  if (typeof answer.value === 'number') {
    if (answer.questionType === 'rating_scale' && answer.scaleMax) {
      return (
        <div className='flex items-center gap-2'>
          <div className='flex gap-0.5'>
            {Array.from({ length: answer.scaleMax }, (_, i) => {
              const active =
                answer.value !== null &&
                typeof answer.value === 'number' &&
                i < answer.value;
              return (
                <span
                  key={i}
                  className={cn(
                    'h-3 w-2 rounded-sm',
                    active ? 'bg-brand' : 'bg-secondary'
                  )}
                />
              );
            })}
          </div>
          <span className='font-mono text-xs font-semibold tabular-nums text-foreground'>
            {answer.value}
            <span className='text-muted-foreground font-normal'>
              /{answer.scaleMax}
            </span>
          </span>
        </div>
      );
    }

    return (
      <span className='inline-flex items-center rounded-lg border border-border bg-secondary/70 px-2 py-1 font-mono text-sm font-semibold tabular-nums text-foreground'>
        {answer.value}
      </span>
    );
  }

  const text = String(answer.value);
  const isChoice =
    answer.questionType === 'single_choice' ||
    answer.questionType === 'dropdown';

  if (isChoice || text.length < 48) {
    return (
      <span
        className={cn(
          'inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs font-medium break-words text-foreground',
          isChoice
            ? 'border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft'
            : 'border border-border bg-secondary/70'
        )}
      >
        {text}
      </span>
    );
  }

  return (
    <p className='rounded-xl border border-border bg-secondary/50 px-2.5 py-1.5 text-sm leading-relaxed break-words text-foreground'>
      {text}
    </p>
  );
}
