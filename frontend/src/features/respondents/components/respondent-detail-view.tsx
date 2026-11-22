'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import { respondentDetailOptions } from '../api/queries';
import type { RespondentAnswer } from '../api/types';
import { cn } from '@/lib/utils';
import { displaySurveyTitle } from '@/lib/survey-display';
import type { ReactNode } from 'react';
import {
  panelWashClass,
  SurvaiPanel,
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
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
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
  const t = useTranslations('respondents');
  const tCommon = useTranslations('common');
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
  const isComplete = detail.status === 'completed';
  const isDrawer = variant === 'drawer';
  const surveyLabel = displaySurveyTitle(detail.surveyTitle);

  const answersList = (
    <div className={cn('flex min-w-0 flex-col', isDrawer ? 'gap-3' : 'gap-4')}>
      {groups.length === 0 ? (
        <SurvaiPanel>
          <div className='flex flex-col items-center px-4 py-12 text-center'>
            <div className='mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground'>
              <Icons.forms className='size-5' />
            </div>
            <p className='font-display font-bold tracking-tight'>
              {t('noAnswersRecorded')}
            </p>
            <p className='text-muted-foreground  max-w-sm text-sm'>
              {t('noAnswersHint')}
            </p>
          </div>
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
                t={t}
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
        <header className={cn(panelWashClass, 'relative shrink-0 overflow-hidden')}>
          <div
            className='pointer-events-none absolute inset-0 opacity-[0.22]'
            aria-hidden
            style={{
              backgroundImage:
                'linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
              maskImage:
                'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 12%, black 88%, transparent)'
            }}
          />
          <div className='relative px-4 py-3.5 pr-12 sm:px-5 sm:pr-14'>
            <div className='flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-center sm:gap-5'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                  <h1 className='font-display truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl'>
                    {detail.name}
                  </h1>
                  <Badge
                    variant={isComplete ? 'accent' : 'meta'}
                    className='h-7 gap-1 px-2.5'
                  >
                    {isComplete ? (
                      <Icons.circleCheck className='size-3 shrink-0' />
                    ) : (
                      <Icons.clock className='size-3 shrink-0' />
                    )}
                    {isComplete ? t('statusCompleted') : t('statusPartial')}
                  </Badge>
                </div>
                <p className='mt-0.5 truncate text-xs font-medium text-muted-foreground'>
                  {detail.email}
                </p>
                <p className='truncate font-mono text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
                  {surveyLabel}
                </p>
              </div>

              <dl className='grid w-full grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:min-w-0'>
                <MetaStat
                  icon={<Icons.calendar className='size-3 shrink-0' />}
                  label={t('colSubmitted')}
                  value={formatDateTime(detail.submittedAt)}
                />
                <MetaStat
                  icon={<Icons.check className='size-3 shrink-0' />}
                  label={t('answeredLabel')}
                  value={`${answeredCount}/${totalQuestions}`}
                  mono
                />
                <MetaStat
                  icon={<Icons.clock className='size-3 shrink-0' />}
                  label={t('durationLabel')}
                  value={formatDuration(detail.durationSeconds)}
                  mono
                  className='col-span-2 min-[480px]:col-span-1'
                />
              </dl>
            </div>

            <SheetClose
              render={
                <Button
                  type='button'
                  variant='outline'
                  size='icon-sm'
                  className='absolute top-3.5 right-4 z-10 size-8 rounded-none border-border bg-background/90 text-foreground hover:bg-muted sm:right-5'
                  aria-label={tCommon('close')}
                />
              }
            >
              <Icons.close className='size-4' />
            </SheetClose>
          </div>
        </header>

        <div className='space-y-3 bg-background px-4 py-4 sm:px-5'>
          {answersList}
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-6 pb-8'>
      <header className='relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-5 py-5 shadow-sm'>
        <div
          className='pointer-events-none absolute inset-0 opacity-[0.32]'
          aria-hidden
          style={{
            backgroundImage:
              'linear-gradient(to right, color-mix(in srgb, var(--foreground) 9%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 9%, transparent) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            maskImage:
              'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, black 20%, black 80%, transparent)'
          }}
        />
        <div className='relative flex items-start gap-3'>
          <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--brand-foreground)_28%,transparent)] bg-brand-foreground font-mono text-xs font-bold tracking-wide text-brand uppercase'>
            {initialsFromName(detail.name)}
          </div>

          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
              <h1 className='font-display text-xl font-extrabold tracking-tight text-brand-foreground sm:text-2xl'>
                {detail.name}
              </h1>
              <Badge
                className={cn(
                  'rounded-full border-transparent text-xs font-semibold',
                  isComplete
                    ? 'bg-brand-foreground text-brand'
                    : 'border border-[color-mix(in_srgb,var(--brand-foreground)_28%,transparent)] bg-[color-mix(in_srgb,var(--brand-foreground)_12%,transparent)] text-brand-foreground'
                )}
              >
                {isComplete ? (
                  <Icons.circleCheck className='mr-1 size-3' />
                ) : (
                  <Icons.clock className='mr-1 size-3' />
                )}
                {isComplete ? t('statusCompleted') : t('statusPartial')}
              </Badge>
            </div>

            <p className='truncate text-sm text-brand-foreground/70'>
              {detail.email}
              <span className='mx-1.5 opacity-40'>·</span>
              <span className='text-brand-foreground'>{surveyLabel}</span>
            </p>

            <dl className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-brand-foreground/75'>
              <div className='flex items-center gap-1.5'>
                <Icons.calendar className='size-3.5 shrink-0 text-brand-foreground' />
                <dt className='sr-only'>{t('colSubmitted')}</dt>
                <dd>{formatDateTime(detail.submittedAt)}</dd>
              </div>
              <span className='hidden h-3 w-px bg-[color-mix(in_srgb,var(--brand-foreground)_28%,transparent)] sm:block' aria-hidden />
              <div className='flex items-center gap-1.5'>
                <Icons.clock className='size-3.5 shrink-0 text-brand-foreground' />
                <dt className='sr-only'>{t('durationLabel')}</dt>
                <dd className='font-mono tabular-nums'>
                  {formatDuration(detail.durationSeconds)}
                </dd>
              </div>
              <span className='hidden h-3 w-px bg-[color-mix(in_srgb,var(--brand-foreground)_28%,transparent)] sm:block' aria-hidden />
              <div className='flex items-center gap-1.5'>
                <Icons.check className='size-3.5 shrink-0 text-brand-foreground' />
                <dt className='sr-only'>{t('answeredLabel')}</dt>
                <dd className='font-mono tabular-nums'>
                  {t('answeredCount', {
                    answered: answeredCount,
                    total: totalQuestions
                  })}
                </dd>
              </div>
            </dl>
          </div>
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
  mono,
  className
}: {
  icon: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[3.25rem] min-w-0 flex-col justify-center rounded-none border border-foreground/15 bg-background/80 px-2.5 py-2',
        className
      )}
    >
      <dt className='text-muted-foreground flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase'>
        {icon}
        <span className='truncate'>{label}</span>
      </dt>
      <dd
        className={cn(
          'truncate text-xs font-semibold text-foreground',
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
              'rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
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
  stacked,
  t
}: {
  answer: RespondentAnswer;
  questionNumber: number;
  isLast: boolean;
  stacked?: boolean;
  t: (key: string) => string;
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
            <p className='text-muted-foreground  text-xs'>
              {answer.helpText}
            </p>
          ) : null}
        </div>
      </div>

      <div className={cn('min-w-0', stacked ? 'pl-6' : 'pl-6 sm:pl-0 sm:pt-0.5')}>
        {renderAnswerValue(answer, t)}
      </div>
    </div>
  );
}

function renderAnswerValue(
  answer: RespondentAnswer,
  t: (key: string) => string
): ReactNode {
  if (!answer.answered || answer.value === null) {
    return (
      <span className='text-muted-foreground inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-2 py-1 text-xs'>
        <Icons.minus className='size-3 opacity-60' />
        {t('noAnswer')}
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
