'use client';

import { useCallback, useState } from 'react';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { surveyByIdOptions, surveyKeys } from '@/features/builder/api/queries';
import { latestReviewOptions } from '../api/queries';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { QualityScore } from './quality-score';
import { updateQuestion } from '@/features/builder/api/service';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import type { Section, Question, QuestionType, QuestionOption } from '@/features/builder/api/types';
import { getQuestionTypeMeta, QUESTION_TYPES } from '@/features/builder/api/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const brandCtaClass =
  'rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-semibold text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)] hover:brightness-105';

function isOptionsType(type: QuestionType) {
  return (
    type === 'single_choice' ||
    type === 'multiple_choice' ||
    type === 'dropdown'
  );
}

interface ReviewerViewProps {
  surveyId: string;
}

export function ReviewerView({ surveyId }: ReviewerViewProps) {
  return <ReviewerContent surveyId={surveyId} />;
}

function ReviewerContent({ surveyId }: { surveyId: string }) {
  const { data: survey } = useSuspenseQuery(surveyByIdOptions(surveyId));
  const { data: report } = useSuspenseQuery(latestReviewOptions(surveyId));
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!survey) {
    notFound();
  }

  return (
    <>
    <AlertModal
      isOpen={deleteOpen}
      onClose={() => setDeleteOpen(false)}
      onConfirm={() => {
        setDeleteOpen(false);
        toast.success('Survey deleted');
      }}
      loading={false}
      title='Delete Survey'
      description='Are you sure you want to delete this survey? This action cannot be undone.'
      confirmLabel='Delete'
    />
    <div className='space-y-4'>
      {/* Survey Header */}
      <div className='flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6'>
        <div className='min-w-0'>
          <h1 className='font-display text-2xl font-extrabold tracking-tight text-foreground'>
            {survey.title}
          </h1>
          {survey.description ? (
            <p className='text-muted-foreground mt-1 max-w-xl text-sm leading-relaxed'>
              {survey.description}
            </p>
          ) : null}
        </div>

        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            nativeButton={false}
            className='text-muted-foreground hover:text-foreground h-9 rounded-xl px-3'
            render={<Link href='/dashboard/surveys' />}
          >
            <Icons.chevronLeft className='size-4' />
            Back to Surveys
          </Button>

          <div className='bg-secondary/80 flex items-center gap-1 rounded-2xl p-1'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-9 rounded-xl px-3 text-foreground hover:bg-card'
            >
              <Icons.sparkles className='mr-1.5 size-3.5 text-brand-strong' />
              Regenerate
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-9 rounded-xl px-3 text-foreground hover:bg-card'
            >
              <Icons.review className='mr-1.5 size-3.5' />
              Review with AI
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setDeleteOpen(true)}
              className='text-destructive hover:bg-destructive/10 hover:text-destructive h-9 rounded-xl px-3'
            >
              <Icons.trash className='mr-1.5 size-3.5' />
              Delete
            </Button>
          </div>

          <Button
            type='button'
            size='sm'
            className={cn(brandCtaClass, 'h-9 px-4')}
          >
            <Icons.check className='mr-1.5 size-3.5' />
            Save Changes
          </Button>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-[1fr_340px]'>
        {/* Main content — surveys in the table are already generated */}
        <div className='space-y-5'>
          {survey.sections.map((section, sIdx) => (
            <SectionReviewCard
              key={section.id}
              section={section}
              index={sIdx}
            />
          ))}
        </div>

        {/* Sidebar */}
        <div className='sticky top-[4.5rem] self-start space-y-4'>
          <div className='overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)]'>
            <div className='space-y-4 p-5'>
              <div className='space-y-1.5'>
                <h3 className='font-display text-xl font-extrabold tracking-tight text-foreground'>
                  Ready to collect?
                </h3>
                <p className='text-foreground/70 text-sm leading-relaxed'>
                  Finish reviewing findings, then publish and share with
                  respondents.
                </p>
              </div>
              <Button
                nativeButton={false}
                render={<Link href={`/dashboard/surveys/${surveyId}/collect`} />}
                className='h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--foreground)_14%,transparent)] bg-card font-semibold text-foreground shadow-sm hover:bg-card/90'
              >
                Go to Collect
                <Icons.arrowRight className='ml-1.5 size-4' />
              </Button>
            </div>
          </div>

          {report ? (
            <QualityScore
              score={report.overallQualityScore}
              criteria={report.scoreCriteria}
              estimatedMinutes={report.estimatedCompletionMinutes}
              requiredQuestionCount={report.requiredQuestionCount}
            />
          ) : null}
        </div>
      </div>
    </div>
    </>
  );
}

function SectionReviewCard({
  section,
  index
}: {
  section: Section;
  index: number;
}) {
  const questionCount = section.questions.length;
  const requiredCount = section.questions.filter((q) => q.isRequired).length;

  return (
    <section className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
      <header className='border-b border-border bg-muted/25 px-4 py-3.5 sm:px-5'>
        <div className='flex items-start gap-3'>
          <span className='flex size-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-display text-sm font-extrabold text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)]'>
            {index + 1}
          </span>
          <div className='min-w-0 flex-1'>
            <h2 className='font-display text-base font-extrabold tracking-tight text-foreground sm:text-lg'>
              {section.title}
            </h2>
            {section.description ? (
              <p className='text-muted-foreground mt-0.5 text-sm leading-relaxed'>
                {section.description}
              </p>
            ) : null}
          </div>
          <div className='flex shrink-0 flex-col items-end gap-1'>
            <Badge
              variant='secondary'
              className='rounded-full border-transparent px-2.5 py-0.5 text-[11px] font-medium'
            >
              {questionCount}{' '}
              {questionCount === 1 ? 'question' : 'questions'}
            </Badge>
            {requiredCount > 0 ? (
              <span className='text-muted-foreground text-[10px] tabular-nums'>
                {requiredCount} required
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className='divide-y divide-border'>
        {section.questions.length === 0 ? (
          <div className='text-muted-foreground px-5 py-8 text-center text-sm'>
            No questions in this section yet.
          </div>
        ) : (
          section.questions.map((question, qIdx) => (
            <QuestionReviewItem
              key={question.id}
              question={question}
              index={qIdx}
            />
          ))
        )}
      </div>
    </section>
  );
}

function QuestionReviewItem({
  question,
  index
}: {
  question: Question;
  index: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(question.promptText);
  const [editHelpText, setEditHelpText] = useState(question.helpText ?? '');
  const [editOptions, setEditOptions] = useState<QuestionOption[]>(
    question.options ?? []
  );
  const [editType, setEditType] = useState<QuestionType>(question.type);
  const [editIsRequired, setEditIsRequired] = useState(question.isRequired);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const typeMeta = getQuestionTypeMeta(isEditing ? editType : question.type);
  const TypeIcon = Icons[typeMeta.icon as keyof typeof Icons];
  const showOptionsEditor = isEditing && isOptionsType(editType);
  const canRemoveOption = editOptions.length > 2;

  const sourceBadge =
    question.source === 'ai_generated'
      ? {
          label: 'AI',
          className:
            'border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-soft text-foreground'
        }
      : question.source === 'ai_edited'
        ? {
            label: 'AI edited',
            className:
              'border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-soft text-foreground'
          }
        : {
            label: 'Manual',
            className: 'border-border bg-muted/60 text-muted-foreground'
          };

  const hasChanges =
    editPrompt !== question.promptText ||
    editHelpText !== (question.helpText ?? '') ||
    editType !== question.type ||
    editIsRequired !== question.isRequired ||
    JSON.stringify(editOptions) !== JSON.stringify(question.options ?? []);

  const handleSave = useCallback(async () => {
    const trimmed = editPrompt.trim();
    if (!trimmed) {
      toast.error('Question text is required');
      return;
    }
    if (isOptionsType(editType)) {
      const filled = editOptions.filter((o) => o.label.trim());
      if (filled.length < 2) {
        toast.error('Add at least two options');
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateQuestion(question.id, {
        promptText: trimmed,
        helpText: editHelpText.trim() || null,
        type: editType,
        isRequired: editIsRequired,
        options: isOptionsType(editType)
          ? editOptions
              .filter((o) => o.label.trim())
              .map((o) => ({
                ...o,
                label: o.label.trim(),
                value: o.label.trim().toLowerCase().replace(/\s+/g, '_')
              }))
          : null
      });
      queryClient.invalidateQueries({
        queryKey: surveyKeys.detail(question.surveyId)
      });
      setIsEditing(false);
      toast.success('Question updated');
    } catch {
      toast.error('Failed to update question');
    } finally {
      setIsSaving(false);
    }
  }, [
    question.id,
    question.surveyId,
    editPrompt,
    editHelpText,
    editType,
    editIsRequired,
    editOptions,
    queryClient
  ]);

  const handleCancel = useCallback(() => {
    setEditPrompt(question.promptText);
    setEditHelpText(question.helpText ?? '');
    setEditOptions(question.options ?? []);
    setEditType(question.type);
    setEditIsRequired(question.isRequired);
    setIsEditing(false);
  }, [question]);

  const startEditing = useCallback(() => {
    setEditPrompt(question.promptText);
    setEditHelpText(question.helpText ?? '');
    setEditOptions(question.options ?? []);
    setEditType(question.type);
    setEditIsRequired(question.isRequired);
    setIsEditing(true);
  }, [question]);

  const handleTypeChange = useCallback(
    (newType: QuestionType) => {
      setEditType(newType);
      const newMeta = getQuestionTypeMeta(newType);
      if (newMeta.hasOptions && editOptions.length === 0) {
        setEditOptions([
          { id: `opt_new_1`, label: 'Option 1', value: 'option_1' },
          { id: `opt_new_2`, label: 'Option 2', value: 'option_2' }
        ]);
      }
    },
    [editOptions.length]
  );

  const addOption = useCallback(() => {
    setEditOptions((prev) => [
      ...prev,
      {
        id: `opt_new_${Date.now()}`,
        label: '',
        value: `option_${prev.length + 1}`
      }
    ]);
  }, []);

  const updateOption = useCallback((optId: string, label: string) => {
    setEditOptions((prev) =>
      prev.map((opt) =>
        opt.id === optId
          ? {
              ...opt,
              label,
              value: label.toLowerCase().replace(/\s+/g, '_')
            }
          : opt
      )
    );
  }, []);

  const removeOption = useCallback((optId: string) => {
    setEditOptions((prev) => prev.filter((opt) => opt.id !== optId));
  }, []);

  if (isEditing) {
    return (
      <div className='bg-[color-mix(in_srgb,var(--brand-soft)_35%,var(--card))] px-4 py-4 sm:px-5'>
        <div className='space-y-4 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)] sm:p-5'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground font-mono text-[11px] font-bold text-background'>
              {index + 1}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 rounded-xl border-border bg-background px-2.5 text-xs font-medium'
                  />
                }
              >
                {TypeIcon ? <TypeIcon className='size-3.5' /> : null}
                {typeMeta.label}
                <Icons.chevronDown className='size-3.5 opacity-60' />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-52'>
                {QUESTION_TYPES.map((qt) => {
                  const Icon = Icons[qt.icon as keyof typeof Icons];
                  const selected = qt.type === editType;
                  return (
                    <DropdownMenuItem
                      key={qt.type}
                      onClick={() => handleTypeChange(qt.type)}
                      className={cn(
                        'flex items-center gap-2',
                        selected && 'bg-brand-soft'
                      )}
                    >
                      {Icon ? <Icon className='size-3.5' /> : null}
                      <span className='flex-1'>{qt.label}</span>
                      {selected ? (
                        <Icons.check className='size-3.5 text-foreground' />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <label className='border-border bg-muted/40 ml-auto flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 sm:ml-0'>
              <Switch
                checked={editIsRequired}
                onCheckedChange={setEditIsRequired}
                className='scale-90'
              />
              <span className='text-xs font-medium'>
                {editIsRequired ? 'Required' : 'Optional'}
              </span>
            </label>

            <Badge
              variant='secondary'
              className={cn(
                'rounded-full border text-[10px] font-semibold',
                sourceBadge.className,
                'ml-0 sm:ml-auto'
              )}
            >
              {question.source !== 'manual' ? (
                <Icons.sparkles className='mr-1 size-2.5' />
              ) : null}
              {sourceBadge.label}
            </Badge>
          </div>

          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label
                htmlFor={`q-prompt-${question.id}`}
                className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'
              >
                Question
              </Label>
              <Textarea
                id={`q-prompt-${question.id}`}
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={2}
                autoFocus
                placeholder='What do you want to ask?'
                className='border-border min-h-[4.5rem] resize-none rounded-xl border-2 text-sm font-medium leading-relaxed focus-visible:border-[color-mix(in_srgb,var(--brand)_65%,var(--foreground))]'
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCancel();
                }}
              />
            </div>

            <div className='space-y-1.5'>
              <Label
                htmlFor={`q-help-${question.id}`}
                className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'
              >
                Help text
                <span className='ml-1 font-normal normal-case tracking-normal opacity-70'>
                  optional
                </span>
              </Label>
              <Input
                id={`q-help-${question.id}`}
                value={editHelpText}
                onChange={(e) => setEditHelpText(e.target.value)}
                placeholder='Clarify how respondents should answer…'
                className='h-9 rounded-xl text-sm'
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCancel();
                }}
              />
            </div>
          </div>

          {showOptionsEditor ? (
            <div className='space-y-2.5'>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
                  Options
                </p>
                <span className='text-muted-foreground font-mono text-[10px] tabular-nums'>
                  {editOptions.length}
                </span>
              </div>

              <ul className='space-y-1.5'>
                {editOptions.map((opt, optIdx) => (
                  <li
                    key={opt.id}
                    className='group/opt flex items-center gap-2'
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-semibold',
                        editType === 'multiple_choice'
                          ? 'border-border bg-muted/50 text-muted-foreground rounded-md'
                          : 'border-border bg-muted/50 text-muted-foreground rounded-full'
                      )}
                      aria-hidden
                    >
                      {optIdx + 1}
                    </span>
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(opt.id, e.target.value)}
                      placeholder={`Option ${optIdx + 1}`}
                      className='h-9 flex-1 rounded-xl text-sm'
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') handleCancel();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      className='text-muted-foreground hover:text-destructive size-8 shrink-0 rounded-lg opacity-70 group-hover/opt:opacity-100'
                      disabled={!canRemoveOption}
                      aria-label={`Remove option ${optIdx + 1}`}
                      onClick={() => removeOption(opt.id)}
                    >
                      <Icons.close className='size-3.5' />
                    </Button>
                  </li>
                ))}
              </ul>

              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 w-full rounded-xl border-dashed text-xs font-medium'
                onClick={addOption}
              >
                <Icons.add className='size-3.5' />
                Add option
              </Button>
            </div>
          ) : null}

          {editType === 'rating_scale' && question.validationRules ? (
            <p className='text-muted-foreground rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs'>
              Scale {question.validationRules.min}–
              {question.validationRules.max}
            </p>
          ) : null}

          <div className='flex flex-wrap items-center gap-2 border-t border-border pt-3'>
            <Button
              type='button'
              size='sm'
              className={cn(brandCtaClass, 'h-9 px-4')}
              onClick={handleSave}
              disabled={isSaving || !hasChanges || !editPrompt.trim()}
            >
              {isSaving ? (
                <Icons.spinner className='size-3.5 animate-spin' />
              ) : (
                <Icons.check className='size-3.5' />
              )}
              Save
            </Button>
            <Button
              type='button'
              size='sm'
              variant='ghost'
              className='h-9 rounded-xl'
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            {hasChanges ? (
              <span className='text-muted-foreground ml-auto text-[11px]'>
                Unsaved changes
              </span>
            ) : (
              <span className='text-muted-foreground ml-auto hidden text-[11px] sm:inline'>
                Esc to cancel
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='group relative flex gap-3 px-4 py-4 transition-colors hover:bg-muted/20 sm:px-5'>
      <span className='text-muted-foreground mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 font-mono text-[11px] font-semibold tabular-nums'>
        {index + 1}
      </span>

      <div className='min-w-0 flex-1 space-y-2.5'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5'>
          <span className='text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium'>
            {TypeIcon ? <TypeIcon className='size-3.5' /> : null}
            {typeMeta.label}
          </span>

          {question.isRequired ? (
            <span className='rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive'>
              Required
            </span>
          ) : (
            <span className='text-muted-foreground rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium'>
              Optional
            </span>
          )}

          <Badge
            variant='secondary'
            className={cn(
              'ml-auto rounded-full border text-[10px] font-semibold',
              sourceBadge.className
            )}
          >
            {question.source !== 'manual' ? (
              <Icons.sparkles className='mr-1 size-2.5' />
            ) : null}
            {sourceBadge.label}
          </Badge>
        </div>

        <button
          type='button'
          onClick={startEditing}
          className='w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <p className='text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground'>
            {question.promptText}
          </p>
          {question.helpText ? (
            <p className='text-muted-foreground mt-1 text-sm leading-relaxed'>
              {question.helpText}
            </p>
          ) : null}
        </button>

        {question.options && question.options.length > 0 ? (
          <ul className='flex flex-wrap gap-1.5 pt-0.5'>
            {question.options.map((opt) => (
              <li
                key={opt.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground/85 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]',
                  question.type === 'multiple_choice' && 'rounded-lg'
                )}
              >
                <span
                  className={cn(
                    'size-2 shrink-0 border border-foreground/25',
                    question.type === 'multiple_choice'
                      ? 'rounded-[2px]'
                      : 'rounded-full'
                  )}
                  aria-hidden
                />
                {opt.label}
              </li>
            ))}
          </ul>
        ) : null}

        {question.type === 'rating_scale' && question.validationRules ? (
          <div className='flex flex-wrap items-center gap-1.5 pt-0.5'>
            {Array.from(
              {
                length:
                  Math.min(
                    7,
                    (question.validationRules.max ?? 5) -
                      (question.validationRules.min ?? 1) +
                      1
                  ) || 5
              },
              (_, i) => (question.validationRules?.min ?? 1) + i
            ).map((n) => (
              <span
                key={n}
                className='border-border bg-muted/40 flex size-7 items-center justify-center rounded-lg border font-mono text-[11px] font-semibold tabular-nums'
              >
                {n}
              </span>
            ))}
            {(question.validationRules.max ?? 5) -
              (question.validationRules.min ?? 1) +
              1 >
            7 ? (
              <span className='text-muted-foreground text-[11px]'>
                …{question.validationRules.max}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <Button
        type='button'
        variant='outline'
        size='sm'
        className='border-border bg-background mt-0.5 h-8 shrink-0 rounded-xl px-2.5 text-xs opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
        onClick={startEditing}
      >
        <Icons.edit className='size-3.5' />
        <span className='hidden sm:inline'>Edit</span>
      </Button>
    </div>
  );
}

