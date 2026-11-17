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
import { canEditOrg, useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';

const QUESTION_TYPE_KEY: Record<QuestionType, string> = {
  short_text: 'shortText',
  long_text: 'longText',
  single_choice: 'singleChoice',
  multiple_choice: 'multipleChoice',
  dropdown: 'dropdown',
  rating_scale: 'ratingScale',
  number: 'number',
  date: 'date'
};

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
  const t = useTranslations('review');
  const tBuilder = useTranslations('builder');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = canEditOrg(user?.role);
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
      toast.error(t('questionNotInDraft'));
      return;
    }
    setHighlightedQuestionId(questionId);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [t]);

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
    if (!canEdit) {
      toast.error(tCommon('viewOnly'), {
        description: t('viewersCannotReview')
      });
      return;
    }
    if (isReviewing || isRegenerating) return;
    const hasQuestions = survey?.sections.some((s) => s.questions.length > 0);
    if (!hasQuestions) {
      toast.error(t('noQuestionsToReview'), {
        description: t('noQuestionsToReviewDesc')
      });
      return;
    }

    try {
      const next = await run('run-review', async () => {
        const result = await triggerReview(surveyId);
        queryClient.setQueryData(reviewerKeys.latest(surveyId), result);
        return result;
      });
      toast.success(t('reviewComplete'), {
        description:
          next.findings.length === 0
            ? t('reviewCompleteNone')
            : t('reviewCompleteSome', { count: next.findings.length })
      });
    } catch (err) {
      toast.error(t('reviewFailed'), {
        description:
          err instanceof Error && err.message
            ? err.message
            : t('reviewFailedDesc')
      });
    }
  }, [
    canEdit,
    isReviewing,
    isRegenerating,
    survey?.sections,
    surveyId,
    queryClient,
    run,
    t,
    tCommon
  ]);

  const handleDelete = useCallback(async () => {
    if (!canEdit) {
      toast.error(tCommon('viewOnly'), {
        description: t('viewersCannotDelete')
      });
      return;
    }
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const ok = await deleteSurvey(surveyId);
      if (!ok) {
        throw new Error(t('surveyNotFoundError'));
      }
      queryClient.removeQueries({ queryKey: surveyKeys.detail(surveyId) });
      queryClient.removeQueries({ queryKey: reviewerKeys.latest(surveyId) });
      await queryClient.invalidateQueries({ queryKey: surveyKeys.list() });
      await queryClient.invalidateQueries({ queryKey: surveyListKeys.all });
      setDeleteOpen(false);
      toast.success(t('surveyDeleted'), {
        description: t('surveyDeletedDesc')
      });
      router.replace('/dashboard/surveys');
    } catch (err) {
      toast.error(t('deleteFailed'), {
        description:
          err instanceof Error && err.message
            ? err.message
            : tCommon('pleaseTryAgain')
      });
    } finally {
      setIsDeleting(false);
    }
  }, [canEdit, isDeleting, surveyId, queryClient, router, t, tCommon]);

  const questionsLocked =
    survey?.status === 'published' ||
    survey?.status === 'closed' ||
    survey?.status === 'archived';
  const readOnly = questionsLocked || !canEdit;

  const handleRegenerate = useCallback(async () => {
    if (!canEdit) {
      toast.error(tCommon('viewOnly'), {
        description: t('viewersCannotRegenerate')
      });
      return;
    }
    if (questionsLocked) {
      toast.error(tBuilder('lockedToast'), {
        description: t('publishedCannotRegenerate')
      });
      return;
    }
    if (!survey?.planId) {
      toast.error(tBuilder('noLinkedPlan'), {
        description: t('noLinkedPlanDesc')
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
      toast.success(tBuilder('surveyRegenerated'), {
        description: tBuilder('surveyRegeneratedDesc', {
          count: next.sections.length
        })
      });
    } catch (err) {
      toast.error(t('regenerateFailed'), {
        description:
          err instanceof Error && err.message
            ? err.message
            : tCommon('pleaseTryAgain')
      });
    }
  }, [
    canEdit,
    questionsLocked,
    survey?.planId,
    survey?.title,
    surveyId,
    isRegenerating,
    queryClient,
    run,
    t,
    tBuilder,
    tCommon
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
            : t('loadFailed')}
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
          {tCommon('retry')}
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
            {t('notFoundTitle')}
          </h2>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            {t('notFoundDesc')}
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href='/dashboard/surveys' aria-label={t('backToSurveysAria')} />}
          className={brandCtaClass}
        >
          {t('backToSurveys')}
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
      ? t('statusLive')
      : survey.status === 'closed'
        ? t('statusClosed')
        : survey.status === 'archived'
          ? t('statusArchived')
          : survey.status
    : t('statusDraft');
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
      title={t('deleteTitle')}
      description={t('deleteDescription')}
      confirmLabel={t('deleteConfirm')}
    />
    <Dialog open={collectWarnOpen} onOpenChange={setCollectWarnOpen}>
      <DialogContent className='sm:max-w-md gap-0 overflow-hidden p-0'>
        <DialogHeader className={dialogHeaderSoftClass}>
          <DialogTitle>{t('openFindingsTitle')}</DialogTitle>
        </DialogHeader>
        <div className='px-4 pt-4 pb-2'>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            {t('openFindingsBody', { count: openFindingCount })}
          </p>
        </div>
        <Separator />
        <div className='flex items-center justify-end gap-2 px-4 py-3'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setCollectWarnOpen(false)}
          >
            {t('stayOnReview')}
          </Button>
          <Button type='button' className={primaryCtaClass} onClick={goToCollect}>
            {t('continueToCollect')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={confirmRegenOpen} onOpenChange={setConfirmRegenOpen}>
      <DialogContent className='sm:max-w-md gap-0 overflow-hidden p-0'>
        <DialogHeader className={dialogHeaderSoftClass}>
          <DialogTitle>{tBuilder('regenerateTitle')}</DialogTitle>
        </DialogHeader>
        <div className='px-4 pt-4 pb-2'>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            {tBuilder('regenerateBody')}
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
            {tCommon('cancel')}
          </Button>
          <Button
            type='button'
            onClick={() => void handleRegenerate()}
            disabled={
              isRegenerating || !survey.planId || questionsLocked
            }
          >
            <Icons.sparkles className='size-4' />
            {tBuilder('replaceRegenerate')}
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
                      ? t('lockedSubtitle')
                      : t('draftSubtitle')}
                  </p>
                )}
              </div>
            }
            badge={
              <span className='rounded-full border border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2.5 py-0.5 text-[10px] font-semibold capitalize text-brand-foreground'>
                {statusLabel}
                {questionsLocked ? t('lockedSuffix') : ''}
              </span>
            }
            actions={
              canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-9 rounded-xl px-2.5 text-brand-foreground hover:bg-primary/10 hover:text-brand-foreground'
                        aria-label={t('moreActions')}
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
                            ? t('reviewing')
                            : report
                              ? t('reReview')
                              : t('reviewWithAi')}
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
                            ? tBuilder('generateQuestions')
                            : t('regenerate')}
                        </DropdownMenuItem>
                      </>
                    ) : null}
                    <DropdownMenuItem
                      variant='destructive'
                      disabled={isRegenerating || isReviewing || isDeleting}
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Icons.trash className='size-3.5' />
                      {t('removeSurvey')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className='rounded-full border border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2.5 py-0.5 text-[10px] font-semibold text-brand-foreground'>
                  {tCommon('viewOnly')}
                </span>
              )
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
                    {t('noQuestionsYet')}
                  </p>
                  <p className='text-muted-foreground mx-auto mt-1 max-w-xs text-xs leading-relaxed'>
                    {t('noQuestionsHint')}
                  </p>
                </div>
                {canEdit && !questionsLocked ? (
                  <Button
                    type='button'
                    className={cn(primaryCtaClass, 'mt-1 h-10 w-auto px-4')}
                    onClick={() => setConfirmRegenOpen(true)}
                    disabled={!survey.planId || isRegenerating}
                  >
                    <Icons.sparkles className='size-3.5' />
                    {tBuilder('generateQuestions')}
                  </Button>
                ) : null}
              </div>
            </SurvaiPanel>
          ) : (
            survey.sections.map((section) => (
              <SectionReviewCard
                key={section.id}
                section={section}
                readOnly={readOnly}
                openFindingsByQuestionId={openFindingsByQuestionId}
                highlightedQuestionId={highlightedQuestionId}
              />
            ))
          )}

          {report ? (
            <FindingsList
              findings={report.findings}
              onFindingUpdate={
                readOnly ? undefined : handleFindingUpdate
              }
              onNavigateToQuestion={navigateToQuestion}
              readOnly={readOnly}
            />
          ) : null}
        </div>

        <div className='sticky top-[4.5rem] self-start space-y-4'>
          <div className='space-y-4 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_12%,transparent)] sm:p-5'>
            <div>
              <p className='font-display text-2xl font-extrabold tracking-tight text-brand-foreground'>
                {questionsLocked ? t('collectingResponses') : t('readyToCollect')}
              </p>
              <p className='mt-1 text-sm leading-relaxed text-brand-foreground/75'>
                {questionsLocked
                  ? t('lockedCollectHint')
                  : t('readyCollectHint')}
              </p>
            </div>
            <ul className='space-y-1.5'>
              <li className='flex items-center gap-2.5 rounded-xl bg-card/90 px-2.5 py-2 ring-1 ring-[color-mix(in_srgb,var(--foreground)_10%,transparent)]'>
                <span className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                  <Icons.forms className='size-3.5' />
                </span>
                <span className='min-w-0 flex-1 text-sm font-medium text-foreground'>
                  {t('questionsAcross', {
                    questions: questionCount,
                    sections: sectionCount
                  })}
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
                    ? t('findingsSummary', {
                        open: openFindingCount,
                        accepted: acceptedFindingCount
                      })
                    : t('reviewNotRun')}
                </span>
              </li>
            </ul>
            <div className='space-y-2'>
              {report && !questionsLocked ? (
                <p className='text-center font-mono text-[11px] font-semibold tracking-wide text-brand-foreground/80 tabular-nums'>
                  {t('findingsSummary', {
                    open: openFindingCount,
                    accepted: acceptedFindingCount
                  })}
                </p>
              ) : null}
              <Button
                type='button'
                className={cn(primaryCtaClass, 'w-full justify-between')}
                onClick={handleCollectClick}
              >
                {questionsLocked ? t('openCollect') : t('goToCollect')}
                <Icons.arrowRight className='size-4' />
              </Button>
              {report && !questionsLocked ? (
                <p className='text-center text-[11px] leading-relaxed text-brand-foreground/70'>
                  {openFindingCount > 0
                    ? t('openFindingsReminder')
                    : t('noOpenFindingsReady')}
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
          ) : canEdit && !questionsLocked ? (
            <SurvaiPanel>
              <SurvaiPanelHeader
                icon={<Icons.review className='size-3.5' />}
                title={t('qualityAssessment')}
                subtitle={t('qualityUseAi')}
              />
              <SurvaiPanelBody>
                <p className='text-sm leading-relaxed text-foreground'>
                  {t('qualityEmptyHint')}
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
  const t = useTranslations('review');
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
              (requiredCount > 0
                ? t('sectionMetaRequired', {
                    count: questionCount,
                    required: requiredCount
                  })
                : t('sectionMeta', { count: questionCount }))}
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
              {t('noQuestionsInSection')}
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
  const t = useTranslations('review');
  const tBuilder = useTranslations('builder');
  const tCommon = useTranslations('common');
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
          label: t('sourceAi'),
          className:
            'border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-soft text-foreground'
        }
      : question.source === 'ai_edited'
        ? {
            label: t('sourceAiEdited'),
            className:
              'border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-soft text-foreground'
          }
        : {
            label: t('sourceManual'),
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
      toast.error(t('questionTextRequired'));
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
        toast.error(t('minTwoOptions'));
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
        throw new Error(t('questionNotFound'));
      }

      queryClient.setQueryData<Survey | null | undefined>(
        surveyKeys.detail(question.surveyId),
        (prev) => patchQuestionInSurveyCache(prev ?? undefined, updated) ?? prev
      );
      setIsEditing(false);
      toast.success(t('questionUpdated'), {
        description:
          updated.source === 'ai_edited'
            ? t('markedAiEdited')
            : undefined
      });
    } catch (err) {
      toast.error(t('updateQuestionFailed'), {
        description:
          err instanceof Error && err.message
            ? err.message
            : tCommon('pleaseTryAgain')
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
    queryClient,
    t,
    tCommon
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
              { id: crypto.randomUUID(), label: tBuilder('optionN', { n: 1 }), value: 'option_1' },
              { id: crypto.randomUUID(), label: tBuilder('optionN', { n: 2 }), value: 'option_2' }
            ]
          : []
    );
    setEditType(question.type);
    setEditIsRequired(question.isRequired);
    setIsEditing(true);
  }, [question, readOnly, tBuilder]);

  const handleTypeChange = useCallback((newType: QuestionType) => {
    setEditType(newType);
    if (isOptionsType(newType)) {
      setEditOptions((prev) =>
        prev.length >= 2
          ? prev
          : [
              {
                id: crypto.randomUUID(),
                label: tBuilder('optionN', { n: 1 }),
                value: 'option_1'
              },
              {
                id: crypto.randomUUID(),
                label: tBuilder('optionN', { n: 2 }),
                value: 'option_2'
              }
            ]
      );
    } else {
      setEditOptions([]);
    }
  }, [tBuilder]);

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
          aria-label={t('questionAria', { index: index + 1 })}
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
                    {t('openCount', { count: openFindingCount })}
                  </span>
                ) : null}
                <span className='inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground'>
                  {ReadTypeIcon ? <ReadTypeIcon className='size-3' /> : null}
                  {tBuilder(QUESTION_TYPE_KEY[question.type])}
                </span>
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[10px] font-medium',
                    question.isRequired
                      ? 'bg-brand-soft text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {question.isRequired ? tCommon('required') : tCommon('optional')}
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
                  {tCommon('edit')}
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
            <SheetTitle>{t('editQuestionN', { index: index + 1 })}</SheetTitle>
            <SheetDescription>
              {t('editQuestionHint')}
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
                  {tBuilder(QUESTION_TYPE_KEY[editType])}
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
                        <span className='flex-1'>{tBuilder(QUESTION_TYPE_KEY[qt.type])}</span>
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
                  {editIsRequired ? tCommon('required') : tCommon('optional')}
                </span>
              </label>
            </div>

            <div className='space-y-1.5'>
              <Label
                htmlFor={`q-prompt-${question.id}`}
                className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'
              >
                {t('questionLabel')}
              </Label>
              <Textarea
                id={`q-prompt-${question.id}`}
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={3}
                autoFocus
                placeholder={t('questionPlaceholder')}
                className='min-h-[5rem] resize-none rounded-xl border-2 border-border text-sm font-medium leading-relaxed focus-visible:border-[color-mix(in_srgb,var(--brand)_65%,var(--foreground))]'
              />
            </div>

            <div className='space-y-1.5'>
              <Label
                htmlFor={`q-help-${question.id}`}
                className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'
              >
                {t('helpText')}
                <span className='ml-1 font-normal normal-case tracking-normal opacity-70'>
                  {t('optionalInline')}
                </span>
              </Label>
              <Input
                id={`q-help-${question.id}`}
                value={editHelpText}
                onChange={(e) => setEditHelpText(e.target.value)}
                placeholder={t('helpPlaceholder')}
                className='h-9 rounded-xl text-sm'
              />
            </div>

            {showOptionsEditor ? (
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
                    {tBuilder('options')}
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
                        placeholder={tBuilder('optionN', { n: optIdx + 1 })}
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
                        aria-label={t('removeOption', { index: optIdx + 1 })}
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
                  {tBuilder('addOption')}
                </Button>
              </div>
            ) : null}

            {editType === 'rating_scale' ? (
              <p className='rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground'>
                {t('scaleRange', {
                  min: question.validationRules?.min ?? 1,
                  max: question.validationRules?.max ?? 5
                })}
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
                {tCommon('save')}
              </Button>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                className='h-9 rounded-xl'
                onClick={handleCancel}
                disabled={isSaving}
              >
                {tCommon('cancel')}
              </Button>
              {hasChanges ? (
                <span className='ml-auto text-[11px] text-muted-foreground'>
                  {tCommon('unsavedChanges')}
                </span>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

