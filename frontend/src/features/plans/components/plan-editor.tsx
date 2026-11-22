'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ContentLanguagePicker } from '@/components/content-language-picker';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import type { ContentLanguage, Plan, ProposedSection } from '../api/types';
import { approvePlan, generatePlanWithAI, updatePlan } from '../api/service';
import {
  createSurveyFromPlan,
  generateSurveyDraft
} from '@/features/builder/api/service';
import {
  surveyByIdOptions,
  surveyKeys
} from '@/features/builder/api/queries';
import { reviewerKeys } from '@/features/reviewer/api/queries';
import { SurveyGenerationProgress } from '@/features/builder/components/survey-generation-progress';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { EditableList } from './editable-list';
import { ProposedSectionsEditor } from './proposed-sections-editor';
import { PlanGenerationProgress } from './plan-generation-progress';
import { PlanQuickActions } from './plan-quick-actions';
import { useUndoRedo } from '@/hooks/use-undo-redo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader,
  SurvaiBrandCard,
  SurvaiRailRow,
  dialogHeaderSoftClass,
  planFieldControlClass,
  planFieldLabelClass,
  primaryCtaClass
} from '@/components/survai-panel';
import {
  composeResearchGoal,
  displaySurveyTitle,
  parseResearchGoalParts
} from '@/lib/survey-display';
import { canEditOrg, useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface PlanEditorProps {
  plan: Plan;
  onPlanUpdate: (plan: Plan) => void;
  /** When set (survey hub Plan tab), regenerate that survey instead of creating a new one. */
  surveyId?: string;
}

function surveyHasQuestions(
  sections: Array<{ questions: unknown[] }> | undefined
): boolean {
  if (!sections?.length) return false;
  return sections.some((s) => (s.questions?.length ?? 0) > 0);
}

function CountBadge({ count }: { count: number }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-none border px-1.5 font-mono text-[11px] font-semibold tabular-nums',
        count > 0
          ? 'border-foreground/20 bg-primary text-primary-foreground'
          : 'border-border bg-muted/50 text-muted-foreground'
      )}
    >
      {count}
    </span>
  );
}

function PlanSubsection({
  title,
  subtitle,
  count,
  children
}: {
  title: string;
  subtitle?: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className='space-y-2.5'>
      <div className='flex items-start justify-between gap-3 border-b border-border pb-2'>
        <div className='min-w-0'>
          <h4 className='text-sm font-bold tracking-tight text-foreground'>{title}</h4>
          {subtitle ? (
            <p className='text-muted-foreground mt-0.5 text-xs leading-snug'>{subtitle}</p>
          ) : null}
        </div>
        <CountBadge count={count} />
      </div>
      {children}
    </section>
  );
}

function stripRedundantGoalPrefix(goal: string): string {
  return goal.replace(/^Description:\s*/i, '').trimStart();
}

interface PlanState {
  researchGoal: string;
  objectives: string[];
  researchQuestions: string[];
  targetRespondents: string[];
  proposedSections: ProposedSection[];
}

export function PlanEditor({ plan, onPlanUpdate, surveyId }: PlanEditorProps) {
  const t = useTranslations('plan');
  const tCommon = useTranslations('common');
  const tSurveys = useTranslations('surveys');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = canEditOrg(user?.role);
  const { data: linkedSurvey } = useQuery({
    ...surveyByIdOptions(surveyId ?? ''),
    enabled: Boolean(surveyId)
  });
  const hasExistingQuestions = surveyHasQuestions(linkedSurvey?.sections);
  const isLocked = plan.isLocked || hasExistingQuestions;
  /** Plan content edits — locked plans and viewers are read-only. */
  const editLocked = isLocked || !canEdit;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);
  const [contentLanguage, setContentLanguage] = useState<ContentLanguage>(
    plan.contentLanguage === 'am' ? 'am' : 'en'
  );

  // Track last saved state to detect unsaved changes
  const lastSavedRef = useRef<string>('');

  // Initialize undo/redo state
  const initialState: PlanState = {
    researchGoal: plan.researchGoal,
    objectives: plan.objectives,
    researchQuestions: plan.researchQuestions,
    targetRespondents: plan.targetRespondents,
    proposedSections: plan.proposedSections
  };

  const {
    state: planState,
    setState: setPlanState,
    replaceState: replacePlanState,
    undo,
    redo,
    canUndo,
    canRedo,
    pastCount,
    futureCount
  } = useUndoRedo<PlanState>(initialState, { maxHistory: 30 });

  const { researchGoal, objectives, researchQuestions, targetRespondents, proposedSections } =
    planState;

  // Initialize last saved state on mount
  useEffect(() => {
    lastSavedRef.current = JSON.stringify({
      ...initialState,
      contentLanguage: plan.contentLanguage === 'am' ? 'am' : 'en'
    });
  }, []);

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    const currentState = JSON.stringify({
      researchGoal,
      contentLanguage,
      objectives,
      researchQuestions,
      targetRespondents,
      proposedSections
    });
    return currentState !== lastSavedRef.current;
  }, [
    researchGoal,
    contentLanguage,
    objectives,
    researchQuestions,
    targetRespondents,
    proposedSections
  ]);

  const handleSave = useCallback(async () => {
    if (editLocked) return;
    setIsSaving(true);
    try {
      const updated = await updatePlan(localPlan.id, {
        researchGoal,
        contentLanguage,
        objectives,
        researchQuestions,
        targetRespondents,
        proposedSections
      });
      if (updated) {
        setLocalPlan(updated);
        setContentLanguage(
          updated.contentLanguage === 'am' ? 'am' : 'en'
        );
        onPlanUpdate(updated);
        // Update last saved state
        lastSavedRef.current = JSON.stringify({
          researchGoal,
          contentLanguage: updated.contentLanguage,
          objectives,
          researchQuestions,
          targetRespondents,
          proposedSections
        });
        toast.success(t('saved'), {
          description: t('savedDesc')
        });
      }
    } catch {
      toast.error(t('saveFailed'), {
        description: t('saveFailedDesc')
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    editLocked,
    localPlan.id,
    researchGoal,
    contentLanguage,
    objectives,
    researchQuestions,
    targetRespondents,
    proposedSections,
    onPlanUpdate,
    t
  ]);

  useEffect(() => {
    if (editLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, undo, redo, editLocked]);

  const handleAIGenerate = useCallback(async () => {
    if (!canEdit) {
      toast.error(t('viewOnlyToast'), {
        description: t('viewOnlyToastDesc')
      });
      return;
    }
    if (isLocked) {
      toast.error(t('locked'), {
        description: t('lockedDesc')
      });
      return;
    }
    const goal = researchGoal.trim();
    if (!goal) {
      toast.error(t('goalRequired'), {
        description: t('goalRequiredDesc')
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Single request: update goal + hard-replace all AI fields on the server.
      const { plan: refreshed, output } = await generatePlanWithAI(
        localPlan.id,
        goal,
        contentLanguage
      );

      // Deep-copy from the persisted plan only — no merge with previous editor state.
      const nextState: PlanState = {
        researchGoal: refreshed.researchGoal,
        objectives: [...refreshed.objectives],
        researchQuestions: [...refreshed.researchQuestions],
        targetRespondents: [...refreshed.targetRespondents],
        proposedSections: refreshed.proposedSections.map((s) => ({
          title: s.title,
          rationale: s.rationale
        }))
      };
      // Wipe undo/redo so old AI content cannot resurface via Undo.
      replacePlanState(nextState);
      lastSavedRef.current = JSON.stringify({
        ...nextState,
        contentLanguage: refreshed.contentLanguage
      });
      setLocalPlan(refreshed);
      setContentLanguage(
        refreshed.contentLanguage === 'am' ? 'am' : 'en'
      );
      onPlanUpdate(refreshed);

      toast.success(t('regenerated'), {
        description: output.notes ?? t('regeneratedDesc')
      });
    } catch {
      toast.error(t('regenFailed'), {
        description: t('regenFailedDesc')
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    canEdit,
    isLocked,
    localPlan.id,
    researchGoal,
    contentLanguage,
    replacePlanState,
    onPlanUpdate,
    t
  ]);

  const proceedToBuilder = useCallback(
    async (saveChanges: boolean) => {
      setShowUnsavedDialog(false);

      const openReviewOnly = () => {
        const targetSurveyId =
          surveyId ?? linkedSurvey?.id ?? localPlan.linkedSurveyId;
        if (targetSurveyId) {
          router.push(`/dashboard/surveys/${targetSurveyId}/review`);
          return;
        }
        toast.error(t('surveyNotFound'), {
          description: t('surveyNotFoundDesc')
        });
      };

      // Viewers never mutate — navigate to Review when a survey exists.
      if (!canEdit) {
        openReviewOnly();
        return;
      }

      // Questions already exist — open Review only (plan is immutable).
      if (isLocked) {
        openReviewOnly();
        return;
      }

      setIsCreatingSurvey(true);

      try {
        // Persist plan edits, then approve so builder grounding is stable (PLN-05).
        if (saveChanges || hasUnsavedChanges()) {
          const saved = await updatePlan(localPlan.id, {
            researchGoal,
            objectives,
            researchQuestions,
            targetRespondents,
            proposedSections
          });
          if (saved) {
            setLocalPlan(saved);
            onPlanUpdate(saved);
            lastSavedRef.current = JSON.stringify({
              researchGoal,
              objectives,
              researchQuestions,
              targetRespondents,
              proposedSections
            });
          }
        }

        if (localPlan.status !== 'approved') {
          const approved = await approvePlan(localPlan.id);
          if (approved) {
            setLocalPlan(approved);
            onPlanUpdate(approved);
          }
        }

        // Existing survey (hub Plan tab): generate in place. Else create from plan.
        const survey = surveyId
          ? await generateSurveyDraft(surveyId)
          : await createSurveyFromPlan(
              localPlan.id,
              displaySurveyTitle(researchGoal) || tSurveys('untitledSurvey')
            );

        queryClient.setQueryData(surveyKeys.detail(survey.id), survey);
        // Hard-replace clears reviewer reports on the API — don't keep stale findings.
        queryClient.setQueryData(reviewerKeys.latest(survey.id), null);

        toast.success(t('draftReady'), {
          description: t('draftReadyDesc')
        });
        router.push(`/dashboard/surveys/${survey.id}/review`);
      } catch (err) {
        toast.error(t('generateSurveyFailed'), {
          description:
            err instanceof Error && err.message
              ? err.message
              : t('saveFailedDesc')
        });
      } finally {
        setIsCreatingSurvey(false);
      }
    },
    [
      localPlan.id,
      localPlan.status,
      researchGoal,
      objectives,
      researchQuestions,
      targetRespondents,
      proposedSections,
      hasUnsavedChanges,
      canEdit,
      isLocked,
      linkedSurvey?.id,
      localPlan.linkedSurveyId,
      onPlanUpdate,
      router,
      surveyId,
      queryClient,
      t,
      tSurveys
    ]
  );

  const handleProceedToBuilder = useCallback(async () => {
    if (!isLocked && hasUnsavedChanges()) {
      setShowUnsavedDialog(true);
      return;
    }

    await proceedToBuilder(false);
  }, [hasUnsavedChanges, isLocked, proceedToBuilder]);

  const hasContent =
    objectives.length > 0 ||
    researchQuestions.length > 0 ||
    targetRespondents.length > 0 ||
    proposedSections.length > 0;

  const readiness = [
    {
      id: 'goal',
      label: t('researchGoal'),
      done: researchGoal.trim().length >= 10
    },
    {
      id: 'objectives',
      label: t('objectives'),
      done: objectives.length > 0,
      count: objectives.length
    },
    {
      id: 'questions',
      label: t('researchQuestions'),
      done: researchQuestions.length > 0,
      count: researchQuestions.length
    },
    {
      id: 'respondents',
      label: t('targetRespondents'),
      done: targetRespondents.length > 0,
      count: targetRespondents.length
    },
    {
      id: 'sections',
      label: t('proposedSections'),
      done: proposedSections.length > 0,
      count: proposedSections.length
    }
  ];
  const readinessDone = readiness.filter((item) => item.done).length;
  const readinessTotal = readiness.length;
  const unsaved = hasUnsavedChanges();
  const canGenerateSurvey = hasContent && researchGoal.trim().length >= 10;
  const { title: surveyTitle, goal: surveyGoal } =
    parseResearchGoalParts(researchGoal);

  function updateResearchParts(nextTitle: string, nextGoal: string) {
    setPlanState((prev) => ({
      ...prev,
      researchGoal: composeResearchGoal(nextTitle, nextGoal)
    }));
  }

  const goalCharCount = stripRedundantGoalPrefix(surveyGoal).length;
  const goalForEdit = stripRedundantGoalPrefix(surveyGoal);

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 lg:grid-cols-12 xl:gap-5'>
        <div className='min-w-0 space-y-4 lg:col-span-6 xl:col-span-7'>
          <SurvaiPanel>
            <SurvaiPanelHeader
              tone='soft'
              title={t('researchPlan')}
              subtitle={t('whatLearning')}
              actions={
                <ContentLanguagePicker
                  value={contentLanguage}
                  onChange={setContentLanguage}
                  disabled={editLocked}
                  density='compact'
                  className='shrink-0'
                />
              }
            />
            <SurvaiPanelBody compact className='space-y-3'>
              <div className='grid gap-3'>
                <div className='space-y-1.5'>
                  <label htmlFor='plan-survey-title' className={planFieldLabelClass}>
                    {t('surveyTitle')}
                  </label>
                  {editLocked ? (
                    <p
                      className={cn(
                        planFieldControlClass,
                        'px-3 py-2.5 text-base font-semibold leading-snug'
                      )}
                    >
                      {surveyTitle.trim() || tSurveys('untitledSurvey')}
                    </p>
                  ) : (
                    <Input
                      id='plan-survey-title'
                      value={surveyTitle}
                      onChange={(e) =>
                        updateResearchParts(e.target.value, surveyGoal)
                      }
                      className={cn(planFieldControlClass, 'h-10 text-base font-semibold')}
                      placeholder={t('titlePlaceholder')}
                    />
                  )}
                </div>

                <div className='space-y-1.5'>
                  <div className='flex items-baseline justify-between gap-2'>
                    <label htmlFor='plan-research-goal' className={planFieldLabelClass}>
                      {t('researchGoal')}
                    </label>
                    <span className='text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums'>
                      {t('charCount', { count: goalCharCount.toLocaleString() })}
                    </span>
                  </div>
                  {editLocked ? (
                    <p
                      className={cn(
                        planFieldControlClass,
                        'px-3 py-3 text-sm leading-relaxed'
                      )}
                    >
                      {goalForEdit || t('noGoalRecorded')}
                    </p>
                  ) : (
                    <Textarea
                      id='plan-research-goal'
                      value={goalForEdit}
                      onChange={(e) =>
                        updateResearchParts(surveyTitle, e.target.value)
                      }
                      rows={4}
                      className={cn(
                        planFieldControlClass,
                        'min-h-[6.5rem] resize-y text-sm leading-relaxed'
                      )}
                      placeholder={t('goalPlaceholder')}
                    />
                  )}
                </div>

                <p className='text-muted-foreground text-xs leading-relaxed'>{t('goalHint')}</p>
              </div>
            </SurvaiPanelBody>
          </SurvaiPanel>

          <SurvaiPanel>
            <SurvaiPanelHeader
              tone='soft'
              title={t('planBlueprint')}
              subtitle={t('planBlueprintSubtitle')}
            />
            <SurvaiPanelBody compact className='space-y-6'>
              <PlanSubsection
                title={t('objectives')}
                subtitle={t('objectivesSubtitle')}
                count={objectives.length}
              >
                <EditableList
                  items={objectives}
                  onChange={(newObjectives) =>
                    setPlanState((prev) => ({
                      ...prev,
                      objectives: newObjectives
                    }))
                  }
                  placeholder={t('objectivePlaceholder')}
                  addLabel={t('addObjective')}
                  emptyMessage={t('noObjectives')}
                  disabled={editLocked}
                  compact
                />
              </PlanSubsection>

              <PlanSubsection
                title={t('researchQuestions')}
                subtitle={t('researchQuestionsSubtitle')}
                count={researchQuestions.length}
              >
                <EditableList
                  items={researchQuestions}
                  onChange={(newQuestions) =>
                    setPlanState((prev) => ({
                      ...prev,
                      researchQuestions: newQuestions
                    }))
                  }
                  placeholder={t('questionPlaceholder')}
                  addLabel={t('addQuestion')}
                  emptyMessage={t('noQuestions')}
                  disabled={editLocked}
                  compact
                />
              </PlanSubsection>

              <PlanSubsection
                title={t('targetRespondents')}
                subtitle={t('targetRespondentsSubtitle')}
                count={targetRespondents.length}
              >
                <EditableList
                  items={targetRespondents}
                  onChange={(newRespondents) =>
                    setPlanState((prev) => ({
                      ...prev,
                      targetRespondents: newRespondents
                    }))
                  }
                  placeholder={t('audiencePlaceholder')}
                  addLabel={t('addAudience')}
                  emptyMessage={t('noAudiences')}
                  disabled={editLocked}
                  compact
                />
              </PlanSubsection>

              <PlanSubsection
                title={t('proposedSections')}
                subtitle={t('proposedSectionsSubtitle')}
                count={proposedSections.length}
              >
                <ProposedSectionsEditor
                  sections={proposedSections}
                  onChange={(newSections) =>
                    setPlanState((prev) => ({
                      ...prev,
                      proposedSections: newSections
                    }))
                  }
                  disabled={editLocked}
                  compact
                />
              </PlanSubsection>
            </SurvaiPanelBody>
          </SurvaiPanel>
        </div>

        <div className='sticky top-[4.25rem] space-y-3 self-start lg:col-span-6 xl:col-span-5'>
          <SurvaiBrandCard
            title={
              !canEdit
                ? t('viewOnlyTitle')
                : isLocked
                  ? t('locked')
                  : canGenerateSurvey
                    ? t('readyWhenYouAre')
                    : t('finishBrief')
            }
            description={
              !canEdit
                ? t('viewerSeatsBody')
                : isLocked
                  ? t('lockedContinueBody')
                  : canGenerateSurvey
                    ? t('readyGenerateBody')
                    : t('finishBriefBody')
            }
          >
            <ul className='space-y-1.5'>
              {readiness.map((item) => (
                <SurvaiRailRow
                  key={item.id}
                  active={item.done}
                  icon={
                    item.done ? (
                      <Icons.check className='size-3.5' strokeWidth={2.5} />
                    ) : (
                      <span className='size-1.5 bg-current opacity-50' />
                    )
                  }
                  trailing={
                    typeof item.count === 'number' ? (
                      <span className='font-mono text-xs tabular-nums text-muted-foreground'>
                        {item.count}
                      </span>
                    ) : undefined
                  }
                >
                  {item.label}
                </SurvaiRailRow>
              ))}
            </ul>

            {canEdit || isLocked || surveyId ? (
              <Button
                type='button'
                className={cn(primaryCtaClass, 'w-full justify-between')}
                onClick={handleProceedToBuilder}
                disabled={
                  isCreatingSurvey ||
                  (!canEdit && !(isLocked || surveyId)) ||
                  (canEdit && !isLocked && !canGenerateSurvey)
                }
              >
                {isCreatingSurvey ? (
                  <>
                    <Icons.spinner className='size-4 animate-spin' />
                    {tCommon('generating')}
                  </>
                ) : !canEdit || isLocked ? (
                  <>
                    <Icons.review className='size-4' />
                    {t('continueToReview')}
                    <Icons.arrowRight className='size-4' />
                  </>
                ) : (
                  <>
                    <Icons.sparkles className='size-4' />
                    {t('generateQuestions')}
                    <Icons.arrowRight className='size-4' />
                  </>
                )}
              </Button>
            ) : null}
          </SurvaiBrandCard>

          {canEdit ? (
            <PlanQuickActions
              canUndo={canUndo}
              canRedo={canRedo}
              pastCount={pastCount}
              futureCount={futureCount}
              onUndo={undo}
              onRedo={redo}
              onSave={() => void handleSave()}
              onRegenerate={() => void handleAIGenerate()}
              isSaving={isSaving}
              isGenerating={isGenerating}
              hasUnsavedChanges={unsaved}
              canRegenerate={Boolean(researchGoal.trim())}
              locked={isLocked}
            />
          ) : (
            <SurvaiPanel>
              <SurvaiPanelHeader
                icon={<Icons.eye className='size-3.5' />}
                title={t('viewOnlyTitle')}
                subtitle={t('viewOnlySubtitle')}
              />
              <SurvaiPanelBody className='p-4'>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  {t('viewOnlyBody')}
                </p>
              </SurvaiPanelBody>
            </SurvaiPanel>
          )}
        </div>
      </div>

      <Dialog
        open={isGenerating}
        onOpenChange={(next) => {
          if (!next && isGenerating) return;
        }}
      >
        <DialogContent
          className='sm:max-w-md gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none ring-0'
          showCloseButton={false}
        >
          <DialogTitle className='sr-only'>{t('generatingPlanTitle')}</DialogTitle>
          <PlanGenerationProgress
            active={isGenerating}
            goalPreview={researchGoal}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreatingSurvey}
        onOpenChange={(next) => {
          if (!next && isCreatingSurvey) return;
        }}
      >
        <DialogContent
          className='sm:max-w-md gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none ring-0'
          showCloseButton={false}
        >
          <DialogTitle className='sr-only'>
            {t('generatingQuestionsTitle')}
          </DialogTitle>
          <SurveyGenerationProgress
            active={isCreatingSurvey}
            goalPreview={researchGoal}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className='sm:max-w-md gap-0 overflow-hidden p-0'>
          <DialogHeader className={dialogHeaderSoftClass}>
            <DialogTitle>{t('saveChangesTitle')}</DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-2'>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {t('saveChangesBody')}
            </p>
          </div>
          <Separator />
          <div className='flex items-center justify-end gap-2 px-4 py-3'>
            <Button variant='outline' onClick={() => proceedToBuilder(false)}>
              {t('discardChanges')}
            </Button>
            <Button
              className='bg-foreground text-background hover:bg-foreground/90'
              onClick={() => proceedToBuilder(true)}
            >
              {t('saveAndProceed')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
