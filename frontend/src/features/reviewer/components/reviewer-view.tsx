'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { surveyByIdOptions, surveyKeys } from '@/features/builder/api/queries';
import { surveyListKeys } from '@/features/surveys/api/queries';
import { latestReviewOptions, reviewerKeys } from '../api/queries';
import { triggerReview } from '../api/service';
import type { ReviewerFinding, ReviewerReport } from '../api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { QualityScore } from './quality-score';
import { FindingsList } from './findings-list';
import {
  deleteSurvey,
  generateSurveyDraft,
  updateQuestion
} from '@/features/builder/api/service';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSurveyActivity } from '@/features/surveys/components/survey-activity-provider';
import type {
  Section,
  Survey,
  Question,
  QuestionType,
  QuestionOption
} from '@/features/builder/api/types';
import { getQuestionTypeMeta, QUESTION_TYPES } from '@/features/builder/api/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader,
  brandCtaClass,
  dialogHeaderSoftClass,
  panelHeaderToneClass,
  primaryCtaClass
} from '@/components/survai-panel';
import {
  displaySurveyDescription,
  displaySurveyTitle
} from '@/lib/survey-display';
import { AuthQueryBoundary } from '@/components/layout/auth-query-boundary';
import { SurveyActivityFallback } from '@/features/surveys/components/survey-activity-fallback';

function isOptionsType(type: QuestionType) {
  return (
    type === 'single_choice' ||
    type === 'multiple_choice' ||
    type === 'dropdown'
  );
}

function optionValueFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'option';
}

function patchQuestionInSurveyCache(
  survey: Survey | undefined,
  updated: Question
): Survey | undefined {
  if (!survey) return survey;
  return {
    ...survey,
    sections: survey.sections.map((section) =>
      section.id !== updated.sectionId
        ? section
        : {
            ...section,
            questions: section.questions.map((q) =>
              q.id === updated.id ? updated : q
            )
          }
    ),
    updatedAt: updated.updatedAt
  };
}

interface ReviewerViewProps {
  surveyId: string;
}

export function ReviewerView({ surveyId }: ReviewerViewProps) {
  return (
    <AuthQueryBoundary
      fallback={<SurveyActivityFallback activity='fetch-review' />}
    >
      <ReviewerContent surveyId={surveyId} />
    </AuthQueryBoundary>
  );
}

function ReviewerContent({ surveyId }: { surveyId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { run, activeId } = useSurveyActivity();
  const surveyQuery = useQuery(surveyByIdOptions(surveyId));
  const reportQuery = useQuery(latestReviewOptions(surveyId));
  const survey = surveyQuery.data;
  const report = reportQuery.data ?? null;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [collectWarnOpen, setCollectWarnOpen] = useState(false);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<
    string | null
  >(null);
  const isRegenerating = activeId === 'regenerate-survey';
  const isReviewing = activeId === 'run-review';

  const openFindingsByQuestionId = useMemo(() => {
    const map = new Map<string, number>();
    for (const finding of report?.findings ?? []) {
      if (finding.status !== 'open' || !finding.questionId) continue;
      map.set(
        finding.questionId,
        (map.get(finding.questionId) ?? 0) + 1
      );
    }
    return map;
  }, [report?.findings]);

  const navigateToQuestion = useCallback((questionId: string) => {
    const el = document.getElementById(`review-question-${questionId}`);
    if (!el) {
      toast.error('Question not found in this draft');
      return;
    }
    setHighlightedQuestionId(questionId);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  useEffect(() => {
    if (!highlightedQuestionId) return;
    const timeout = window.setTimeout(() => {
      setHighlightedQuestionId(null);
    }, 2400);
    return () => window.clearTimeout(timeout);
  }, [highlightedQuestionId]);

  const handleFindingUpdate = useCallback(
    (finding: ReviewerFinding) => {
      queryClient.setQueryData<ReviewerReport | null>(
        reviewerKeys.latest(surveyId),
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            findings: prev.findings.map((f) =>
              f.id === finding.id ? finding : f
            )
          };
        }
      );
    },
    [queryClient, surveyId]
  );

  const handleReview = useCallback(async () => {
    if (isReviewing || isRegenerating) return;
    const hasQuestions = survey?.sections.some((s) => s.questions.length > 0);
    if (!hasQuestions) {
      toast.error('No questions to review', {
        description: 'Generate or add questions before running AI review.'
      });
      return;
    }

    try {
      const next = await run('run-review', async () => {
        const result = await triggerReview(surveyId);
        queryClient.setQueryData(reviewerKeys.latest(surveyId), result);
        return result;
      });
      toast.success('Review complete', {
        description:
          next.findings.length === 0
            ? 'No issues flagged — still advisory only.'
            : `Found ${next.findings.length} potential issue${next.findings.length === 1 ? '' : 's'}.`
      });
    } catch (err) {
      toast.error('Review failed', {
        description:
          err instanceof Error && err.message
            ? err.message
            : 'AI could not complete the review. Please try again.'
      });
    }
  }, [
    isReviewing,
    isRegenerating,
    survey?.sections,
    surveyId,
    queryClient,
    run
  ]);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const ok = await deleteSurvey(surveyId);
      if (!ok) {
        throw new Error('Survey not found');
      }
      queryClient.removeQueries({ queryKey: surveyKeys.detail(surveyId) });
      queryClient.removeQueries({ queryKey: reviewerKeys.latest(surveyId) });
      await queryClient.invalidateQueries({ queryKey: surveyKeys.list() });
      await queryClient.invalidateQueries({ queryKey: surveyListKeys.all });
      setDeleteOpen(false);
      toast.success('Survey deleted', {
        description: 'The linked research plan was kept.'
      });
      router.replace('/dashboard/surveys');
    } catch (err) {
      toast.error('Failed to delete survey', {
        description:
          err instanceof Error && err.message
            ? err.message
            : 'Please try again.'
      });
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, surveyId, queryClient, router]);

  const questionsLocked =
    survey?.status === 'published' ||
    survey?.status === 'closed' ||
    survey?.status === 'archived';

  const handleRegenerate = useCallback(async () => {
    if (questionsLocked) {
      toast.error('Survey locked', {
        description:
          'Published surveys cannot regenerate questions.'
      });
      return;
    }
    if (!survey?.planId) {
      toast.error('No linked plan', {
        description:
          'This survey has no research plan to regenerate questions from.'
      });
      return;
    }
    if (isRegenerating) return;

    setConfirmRegenOpen(false);
    try {
      const next = await run(
        'regenerate-survey',
        async () => {
          const draft = await generateSurveyDraft(surveyId);
          // Hard-replace cache — same survey id, no merge with prior sections.
          queryClient.setQueryData(surveyKeys.detail(surveyId), draft);
          await queryClient.invalidateQueries({
            queryKey: surveyKeys.detail(surveyId)
          });
          await queryClient.invalidateQueries({ queryKey: surveyKeys.list() });
          // Backend deletes reviewer reports on hard-replace; keep cache in sync.
          queryClient.setQueryData(reviewerKeys.latest(surveyId), null);
          await queryClient.invalidateQueries({
            queryKey: reviewerKeys.latest(surveyId)
          });
          return draft;
        },
        { previewText: survey?.title }
      );
      toast.success('Survey regenerated', {
        description: `Replaced with ${next.sections.length} sections from your plan.`
      });
    } catch (err) {
      toast.error('Failed to regenerate survey', {
        description:
          err instanceof Error && err.message
            ? err.message
            : 'Please try again.'
      });
    }
  }, [
    questionsLocked,
    survey?.planId,
    survey?.title,
    surveyId,
    isRegenerating,
    queryClient,
    run
  ]);

  if (surveyQuery.isLoading || reportQuery.isLoading) {
    return <SurveyActivityFallback activity='fetch-review' />;
  }

  if (surveyQuery.isError) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
        <p className='text-sm font-medium text-foreground'>
          {surveyQuery.error instanceof Error
            ? surveyQuery.error.message
            : 'Could not load this survey'}
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-xl'
          onClick={() => {
            void surveyQuery.refetch();
            void reportQuery.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className='mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center'>
        <div className='bg-brand-soft flex size-12 items-center justify-center rounded-2xl'>
          <Icons.survey className='size-5 text-foreground' />
        </div>
        <div className='space-y-1.5'>
          <h2 className='font-display text-xl font-extrabold tracking-tight'>
            Survey not found
          </h2>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            This survey is missing or you don&apos;t have access to it.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href='/dashboard/surveys' />}
          className={brandCtaClass}
        >
          Back to Surveys
          <Icons.arrowRight className='ml-1.5 size-4' />
        </Button>
      </div>
    );
  }

  const title = displaySurveyTitle(survey.title);
  const description = displaySurveyDescription(
    survey.title,
    survey.description
  );
  const sectionCount = survey.sections.length;
  const questionCount = survey.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  );
  const statusLabel = questionsLocked
    ? survey.status === 'published'
      ? 'Live'
      : survey.status
    : 'Draft';
  const openFindingCount =
    report?.findings.filter((f) => f.status === 'open').length ?? 0;
  const acceptedFindingCount =
    report?.findings.filter((f) => f.status === 'accepted').length ?? 0;
  const collectHref = `/dashboard/surveys/${surveyId}/collect`;

  function goToCollect() {
    setCollectWarnOpen(false);
    router.push(collectHref);
  }

  function handleCollectClick() {
    if (!questionsLocked && openFindingCount > 0) {
      setCollectWarnOpen(true);
      return;
    }
    goToCollect();
  }

  return (
    <>
    <AlertModal
      isOpen={deleteOpen}
      onClose={() => {
        if (!isDeleting) setDeleteOpen(false);
      }}
      onConfirm={() => void handleDelete()}
      loading={isDeleting}
      title='Delete survey?'
      description='This permanently deletes the questionnaire (sections and questions). The linked research plan is kept so you can generate a new survey from it later.'
      confirmLabel='Delete survey'
    />
    <Dialog open={collectWarnOpen} onOpenChange={setCollectWarnOpen}>
      <DialogContent className='sm:max-w-md gap-0 overflow-hidden p-0'>
        <DialogHeader className={dialogHeaderSoftClass}>
          <DialogTitle>Open findings remain</DialogTitle>
        </DialogHeader>
        <div className='px-4 pt-4 pb-2'>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            You still have {openFindingCount} open finding
            {openFindingCount === 1 ? '' : 's'}. You can continue to Collect and
            publish, or stay here and resolve them first.
          </p>
        </div>
        <Separator />
        <div className='flex items-center justify-end gap-2 px-4 py-3'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setCollectWarnOpen(false)}
          >
            Stay on Review
          </Button>
          <Button type='button' className={primaryCtaClass} onClick={goToCollect}>
            Continue to Collect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={confirmRegenOpen} onOpenChange={setConfirmRegenOpen}>
      <DialogContent className='sm:max-w-md gap-0 overflow-hidden p-0'>
        <DialogHeader className={dialogHeaderSoftClass}>
          <DialogTitle>Regenerate survey questions?</DialogTitle>
        </DialogHeader>
        <div className='px-4 pt-4 pb-2'>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            This permanently replaces every section and question on this survey
            with a new AI draft from the linked plan. The survey id stays the
            same — previous questions are not kept or merged.
          </p>
        </div>
        <Separator />
        <div className='flex items-center justify-end gap-2 px-4 py-3'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setConfirmRegenOpen(false)}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
          <Button
            type='button'
            onClick={() => void handleRegenerate()}
            disabled={
              isRegenerating || !survey.planId || questionsLocked
            }
          >
            <Icons.sparkles className='size-4' />
            Replace &amp; regenerate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <div className='grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,28rem)]'>
      <div
        className={cn(
          'space-y-5 transition-opacity',
          (isRegenerating || isReviewing) && 'pointer-events-none opacity-50'
        )}
        aria-busy={isRegenerating || isReviewing}
      >
        <SurvaiPanel>
          <SurvaiPanelHeader
            tone='brand'
            title={
              <div className='min-w-0'>
                <h1 className='font-display line-clamp-2 text-xl font-extrabold tracking-tight text-brand-foreground sm:text-2xl'>
                  {title}
                </h1>
                {description ? (
                  <p className='mt-1 line-clamp-2 text-sm leading-snug text-brand-foreground/70'>
                    {description}
                  </p>
                ) : (
                  <p className='mt-1 text-sm leading-snug text-brand-foreground/70'>
                    {questionsLocked
                      ? 'Questions are locked — review the draft structure below.'
                      : 'Edit questions, run AI review, then continue to Collect.'}
                  </p>
                )}
              </div>
            }
            badge={
              <span className='rounded-full border border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2.5 py-0.5 text-[10px] font-semibold capitalize text-brand-foreground'>
                {statusLabel}
                {questionsLocked ? ' · locked' : ''}
              </span>
            }
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-9 rounded-xl px-2.5 text-brand-foreground hover:bg-primary/10 hover:text-brand-foreground'
                      aria-label='More actions'
                    />
                  }
                >
                  <Icons.ellipsis className='size-4' />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-52'>
                  {!questionsLocked ? (
                    <>
                      <DropdownMenuItem
                        disabled={
                          isRegenerating ||
                          isReviewing ||
                          questionCount === 0
                        }
                        onClick={() => void handleReview()}
                      >
                        {isReviewing ? (
                          <Icons.spinner className='size-3.5 animate-spin' />
                        ) : (
                          <Icons.review className='size-3.5' />
                        )}
                        {isReviewing
                          ? 'Reviewing…'
                          : report
                            ? 'Re-run review'
                            : 'Review with AI'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={
                          isRegenerating || isReviewing || !survey.planId
                        }
                        onClick={() => setConfirmRegenOpen(true)}
                      >
                        {isRegenerating ? (
                          <Icons.spinner className='size-3.5 animate-spin' />
                        ) : (
                          <Icons.sparkles className='size-3.5' />
                        )}
                        {questionCount === 0
                          ? 'Generate questions'
                          : 'Regenerate'}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  <DropdownMenuItem
                    variant='destructive'
                    disabled={isRegenerating || isReviewing || isDeleting}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Icons.trash className='size-3.5' />
                    Remove survey
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        </SurvaiPanel>

          {survey.sections.length === 0 ? (
            <SurvaiPanel>
              <div className='flex flex-col items-center justify-center gap-3 px-6 py-16 text-center'>
                <div className='flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm'>
                  <Icons.forms className='size-5' />
                </div>
                <div>
                  <p className='font-display text-base font-extrabold tracking-tight'>
                    No questions yet
                  </p>
                  <p className='text-muted-foreground mx-auto mt-1 max-w-xs text-xs leading-relaxed'>
                    Generate a draft from your plan, then refine each question
                    here.
                  </p>
                </div>
                {!questionsLocked ? (
                  <Button
                    type='button'
                    className={cn(primaryCtaClass, 'mt-1 h-10 w-auto px-4')}
                    onClick={() => setConfirmRegenOpen(true)}
                    disabled={!survey.planId || isRegenerating}
                  >
                    <Icons.sparkles className='size-3.5' />
                    Generate questions
                  </Button>
                ) : null}
              </div>
            </SurvaiPanel>
          ) : (
            survey.sections.map((section) => (
              <SectionReviewCard
                key={section.id}
                section={section}
                readOnly={questionsLocked}
                openFindingsByQuestionId={openFindingsByQuestionId}
                highlightedQuestionId={highlightedQuestionId}
              />
            ))
          )}

          {report ? (
            <FindingsList
              findings={report.findings}
              onFindingUpdate={
                questionsLocked ? undefined : handleFindingUpdate
              }
              onNavigateToQuestion={navigateToQuestion}
              readOnly={questionsLocked}
            />
          ) : null}
        </div>

        <div className='sticky top-[4.5rem] self-start space-y-4'>
          <div className='space-y-4 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_12%,transparent)] sm:p-5'>
            <div>
              <p className='font-display text-2xl font-extrabold tracking-tight text-brand-foreground'>
                {questionsLocked ? 'Collecting responses' : 'Ready to collect?'}
              </p>
              <p className='mt-1 text-sm leading-relaxed text-brand-foreground/75'>
                {questionsLocked
                  ? 'Questions are locked while this survey is live. Share and monitor from Collect.'
                  : 'Finish reviewing findings, then publish and share with respondents.'}
              </p>
            </div>
            <ul className='space-y-1.5'>
              <li className='flex items-center gap-2.5 rounded-xl bg-card/90 px-2.5 py-2 ring-1 ring-[color-mix(in_srgb,var(--foreground)_10%,transparent)]'>
                <span className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                  <Icons.forms className='size-3.5' />
                </span>
                <span className='min-w-0 flex-1 text-sm font-medium text-foreground'>
                  {questionCount} questions across {sectionCount} sections
                </span>
              </li>
              <li className='flex items-center gap-2.5 rounded-xl bg-card/90 px-2.5 py-2 ring-1 ring-[color-mix(in_srgb,var(--foreground)_10%,transparent)]'>
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-lg',
                    report
                      ? openFindingCount > 0
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {report && openFindingCount === 0 ? (
                    <Icons.check className='size-3.5' strokeWidth={2.5} />
                  ) : (
                    <Icons.review className='size-3.5' />
                  )}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm',
                    report
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {report
                    ? `${openFindingCount} open · ${acceptedFindingCount} accepted`
                    : 'AI review not run yet'}
                </span>
              </li>
            </ul>
            <div className='space-y-2'>
              {report && !questionsLocked ? (
                <p className='text-center font-mono text-[11px] font-semibold tracking-wide text-brand-foreground/80 tabular-nums'>
                  {openFindingCount} open · {acceptedFindingCount} accepted
                </p>
              ) : null}
              <Button
                type='button'
                className={cn(primaryCtaClass, 'w-full justify-between')}
                onClick={handleCollectClick}
              >
                {questionsLocked ? 'Open Collect' : 'Go to Collect'}
                <Icons.arrowRight className='size-4' />
              </Button>
              {report && !questionsLocked ? (
                <p className='text-center text-[11px] leading-relaxed text-brand-foreground/70'>
                  {openFindingCount > 0
                    ? 'Open findings aren’t a hard block — you’ll get a reminder before leaving.'
                    : 'No open findings — ready to publish from Collect.'}
                </p>
              ) : null}
            </div>
          </div>

          {report?.overallQualityScore != null ? (
            <QualityScore
              score={report.overallQualityScore}
              criteria={report.scoreCriteria}
              estimatedMinutes={report.estimatedCompletionMinutes ?? 0}
              requiredQuestionCount={report.requiredQuestionCount ?? 0}
            />
          ) : !questionsLocked ? (
            <SurvaiPanel>
              <SurvaiPanelHeader
                icon={<Icons.review className='size-3.5' />}
                title='Quality assessment'
                subtitle='Use Review with AI in the header'
              />
              <SurvaiPanelBody>
                <p className='text-sm leading-relaxed text-foreground'>
                  Checks leading wording, ambiguity, and alignment with your
                  research plan. Advisory only — not a certification.
                </p>
              </SurvaiPanelBody>
            </SurvaiPanel>
          ) : null}
        </div>
    </div>
    </>
  );
}

function SectionReviewCard({
  section,
  readOnly = false,
  openFindingsByQuestionId,
  highlightedQuestionId
}: {
  section: Section;
  readOnly?: boolean;
  openFindingsByQuestionId: Map<string, number>;
  highlightedQuestionId: string | null;
}) {
  const questionCount = section.questions.length;
  const requiredCount = section.questions.filter((q) => q.isRequired).length;

  return (
    <SurvaiPanel>
      <div
        className={cn(
          panelHeaderToneClass.soft,
          'flex items-center gap-3 px-4 py-3 sm:px-5'
        )}
      >
        <div className='min-w-0 flex-1'>
          <h2 className='text-sm font-semibold tracking-tight text-foreground sm:text-[0.95rem]'>
            {section.title}
          </h2>
          <p className='text-[11px] leading-snug text-muted-foreground'>
            {section.description?.trim() ||
              `${questionCount} question${questionCount === 1 ? '' : 's'}${
                requiredCount > 0 ? ` · ${requiredCount} required` : ''
              }`}
          </p>
        </div>
        <span className='text-muted-foreground font-mono text-[10px] tabular-nums'>
          {questionCount}
        </span>
      </div>

      <div className='divide-y divide-border'>
        {section.questions.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-2 px-5 py-8 text-center'>
            <p className='text-sm text-muted-foreground'>
              No questions in this section yet
            </p>
          </div>
        ) : (
          section.questions.map((question, qIdx) => (
            <QuestionReviewItem
              key={question.id}
              question={question}
              index={qIdx}
              readOnly={readOnly}
              openFindingCount={
                openFindingsByQuestionId.get(question.id) ?? 0
              }
              highlighted={highlightedQuestionId === question.id}
            />
          ))
        )}
      </div>
    </SurvaiPanel>
  );
}

function QuestionReviewItem({
  question,
  index,
  readOnly = false,
  openFindingCount = 0,
  highlighted = false
}: {
  question: Question;
  index: number;
  readOnly?: boolean;
  openFindingCount?: number;
  highlighted?: boolean;
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

  // Keep display state aligned after regenerate / refetch (not while editing).
  useEffect(() => {
    if (isEditing) return;
    setEditPrompt(question.promptText);
    setEditHelpText(question.helpText ?? '');
    setEditOptions(question.options ?? []);
    setEditType(question.type);
    setEditIsRequired(question.isRequired);
  }, [question, isEditing]);

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

    let nextOptions: QuestionOption[] | null = null;
    if (isOptionsType(editType)) {
      const filled = editOptions
        .map((o) => ({
          ...o,
          label: o.label.trim(),
          value: optionValueFromLabel(o.label)
        }))
        .filter((o) => o.label.length > 0);
      if (filled.length < 2) {
        toast.error('Add at least two options');
        return;
      }
      // Ensure unique option values
      const seen = new Set<string>();
      nextOptions = filled.map((o) => {
        let value = o.value;
        let n = 2;
        while (seen.has(value)) {
          value = `${o.value}_${n}`;
          n += 1;
        }
        seen.add(value);
        return { ...o, value };
      });
    }

    setIsSaving(true);
    try {
      const updated = await updateQuestion(question.surveyId, question.id, {
        promptText: trimmed,
        helpText: editHelpText.trim() || null,
        type: editType,
        isRequired: editIsRequired,
        options: nextOptions,
        ...(editType === 'rating_scale'
          ? { validationRules: { min: 1, max: 5 } }
          : question.type === 'rating_scale'
            ? { validationRules: null }
            : {})
      });
      if (!updated) {
        throw new Error('Question not found');
      }

      queryClient.setQueryData<Survey | null | undefined>(
        surveyKeys.detail(question.surveyId),
        (prev) => patchQuestionInSurveyCache(prev ?? undefined, updated) ?? prev
      );
      setIsEditing(false);
      toast.success('Question updated', {
        description:
          updated.source === 'ai_edited'
            ? 'Marked as AI edited'
            : undefined
      });
    } catch (err) {
      toast.error('Failed to update question', {
        description:
          err instanceof Error && err.message
            ? err.message
            : 'Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    question.id,
    question.surveyId,
    question.type,
    question.validationRules,
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

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      if (isSaving) return;
      handleCancel();
    },
    [handleCancel, isSaving]
  );

  const startEditing = useCallback(() => {
    if (readOnly) return;
    setEditPrompt(question.promptText);
    setEditHelpText(question.helpText ?? '');
    setEditOptions(
      question.options?.length
        ? question.options
        : isOptionsType(question.type)
          ? [
              { id: crypto.randomUUID(), label: 'Option 1', value: 'option_1' },
              { id: crypto.randomUUID(), label: 'Option 2', value: 'option_2' }
            ]
          : []
    );
    setEditType(question.type);
    setEditIsRequired(question.isRequired);
    setIsEditing(true);
  }, [question, readOnly]);

  const handleTypeChange = useCallback((newType: QuestionType) => {
    setEditType(newType);
    if (isOptionsType(newType)) {
      setEditOptions((prev) =>
        prev.length >= 2
          ? prev
          : [
              {
                id: crypto.randomUUID(),
                label: 'Option 1',
                value: 'option_1'
              },
              {
                id: crypto.randomUUID(),
                label: 'Option 2',
                value: 'option_2'
              }
            ]
      );
    } else {
      setEditOptions([]);
    }
  }, []);

  const addOption = useCallback(() => {
    setEditOptions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
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
              value: optionValueFromLabel(label)
            }
          : opt
      )
    );
  }, []);

  const removeOption = useCallback((optId: string) => {
    setEditOptions((prev) => prev.filter((opt) => opt.id !== optId));
  }, []);

  const readTypeMeta = getQuestionTypeMeta(question.type);
  const ReadTypeIcon = Icons[readTypeMeta.icon as keyof typeof Icons];

  return (
    <>
      <div
        id={`review-question-${question.id}`}
        className={cn(
          'group relative flex scroll-mt-24 items-start gap-3 px-4 py-3.5 transition-[background-color,box-shadow] sm:px-5',
          !readOnly && 'hover:bg-muted/40',
          highlighted &&
            'bg-brand-soft/70 ring-2 ring-inset ring-[color-mix(in_srgb,var(--brand)_55%,transparent)]'
        )}
      >
        <span
          className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-soft font-mono text-[10px] font-semibold tabular-nums text-primary'
          aria-label={`Question ${index + 1}`}
        >
          {index + 1}
        </span>

        <div className='min-w-0 flex-1 space-y-2'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
            <div className='min-w-0 flex-1'>
              <p className='text-[0.95rem] font-medium leading-snug text-foreground sm:text-base'>
                {question.promptText}
              </p>
              {question.helpText ? (
                <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                  {question.helpText}
                </p>
              ) : null}
            </div>

            <div className='flex w-full flex-col gap-1.5 sm:w-auto sm:max-w-[14rem] sm:items-end'>
              <div className='flex flex-wrap items-center gap-1.5 sm:justify-end'>
                {openFindingCount > 0 ? (
                  <span className='rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground'>
                    {openFindingCount} open
                  </span>
                ) : null}
                <span className='inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground'>
                  {ReadTypeIcon ? <ReadTypeIcon className='size-3' /> : null}
                  {readTypeMeta.label}
                </span>
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[10px] font-medium',
                    question.isRequired
                      ? 'bg-brand-soft text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {question.isRequired ? 'Required' : 'Optional'}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium',
                    sourceBadge.className
                  )}
                >
                  {question.source !== 'manual' ? (
                    <Icons.sparkles className='size-2.5' />
                  ) : null}
                  {sourceBadge.label}
                </span>
              </div>
              {!readOnly ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-7 w-fit rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground'
                  onClick={startEditing}
                >
                  <Icons.edit className='size-3.5' />
                  Edit
                </Button>
              ) : null}
            </div>
          </div>

          {question.options && question.options.length > 0 ? (
            <ul className='flex flex-wrap gap-1.5'>
              {question.options.map((opt) => (
                <li
                  key={opt.id}
                  className='inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] text-foreground'
                >
                  <span
                    className={cn(
                      'size-1.5 shrink-0 bg-primary/70',
                      question.type === 'multiple_choice'
                        ? 'rounded-[1px]'
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
            <div className='flex flex-wrap items-center gap-1'>
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
                  className='flex size-6 items-center justify-center rounded-md border border-border bg-muted/40 font-mono text-[10px] tabular-nums text-muted-foreground'
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
      </div>

      <Sheet open={isEditing} onOpenChange={handleSheetOpenChange}>
        <SheetContent side='right' className='gap-0 p-0 sm:max-w-md'>
          <SheetHeader className='border-b border-border px-4 py-4'>
            <SheetTitle>Edit question {index + 1}</SheetTitle>
            <SheetDescription>
              Change type, options, and required — save when done.
            </SheetDescription>
          </SheetHeader>

          <div className='flex-1 space-y-4 overflow-y-auto px-4 py-4'>
            <div className='flex flex-wrap items-center gap-2'>
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

              <label className='flex cursor-pointer items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1'>
                <Switch
                  checked={editIsRequired}
                  onCheckedChange={setEditIsRequired}
                  className='scale-90'
                />
                <span className='text-xs font-medium'>
                  {editIsRequired ? 'Required' : 'Optional'}
                </span>
              </label>
            </div>

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
                rows={3}
                autoFocus
                placeholder='What do you want to ask?'
                className='min-h-[5rem] resize-none rounded-xl border-2 border-border text-sm font-medium leading-relaxed focus-visible:border-[color-mix(in_srgb,var(--brand)_65%,var(--foreground))]'
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
              />
            </div>

            {showOptionsEditor ? (
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
                    Options
                  </p>
                  <span className='font-mono text-[10px] text-muted-foreground tabular-nums'>
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
                          'flex size-7 shrink-0 items-center justify-center border text-[10px] font-semibold',
                          editType === 'multiple_choice'
                            ? 'rounded-md border-border bg-muted/50 text-muted-foreground'
                            : 'rounded-full border-border bg-muted/50 text-muted-foreground'
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
                        className='size-8 shrink-0 rounded-lg text-muted-foreground opacity-70 hover:text-destructive group-hover/opt:opacity-100'
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

            {editType === 'rating_scale' ? (
              <p className='rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground'>
                Scale{' '}
                {question.validationRules?.min ?? 1}–
                {question.validationRules?.max ?? 5}
              </p>
            ) : null}
          </div>

          <SheetFooter className='border-t border-border'>
            <div className='flex w-full flex-wrap items-center gap-2'>
              <Button
                type='button'
                size='sm'
                className={cn(brandCtaClass, 'h-9 px-4')}
                onClick={() => void handleSave()}
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
                <span className='ml-auto text-[11px] text-muted-foreground'>
                  Unsaved changes
                </span>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

