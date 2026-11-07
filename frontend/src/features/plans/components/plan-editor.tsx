'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import type { Plan, ProposedSection } from '../api/types';
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
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { displaySurveyTitle } from '@/lib/survey-display';
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

const blackCtaClass =
  'h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-foreground px-4 text-sm font-semibold text-background shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] hover:bg-foreground/90 disabled:opacity-60';

function CountBadge({ count }: { count: number }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums ring-1',
        count > 0
          ? 'bg-primary text-primary-foreground ring-[color-mix(in_srgb,var(--primary)_70%,var(--foreground))]'
          : 'bg-card text-muted-foreground ring-border'
      )}
    >
      {count}
    </span>
  );
}

/** Highlight only the "Survey title:" label in composed research goals. */
function ResearchGoalDisplay({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return <>No research goal recorded.</>;

  const match = trimmed.match(/^(Survey\s*title:)\s*([\s\S]*)$/i);
  if (!match) return <>{trimmed}</>;

  return (
    <>
      <span className='text-primary'>{match[1]}</span>
      {match[2] ? <> {match[2]}</> : null}
    </>
  );
}

interface PlanState {
  researchGoal: string;
  objectives: string[];
  researchQuestions: string[];
  targetRespondents: string[];
  proposedSections: ProposedSection[];
}

export function PlanEditor({ plan, onPlanUpdate, surveyId }: PlanEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: linkedSurvey } = useQuery({
    ...surveyByIdOptions(surveyId ?? ''),
    enabled: Boolean(surveyId)
  });
  const hasExistingQuestions = surveyHasQuestions(linkedSurvey?.sections);
  const isLocked = plan.isLocked || hasExistingQuestions;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);
  
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
    lastSavedRef.current = JSON.stringify(initialState);
  }, []);

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    const currentState = JSON.stringify({
      researchGoal,
      objectives,
      researchQuestions,
      targetRespondents,
      proposedSections
    });
    return currentState !== lastSavedRef.current;
  }, [researchGoal, objectives, researchQuestions, targetRespondents, proposedSections]);

  // Keyboard shortcuts (disabled once the plan is locked)
  useEffect(() => {
    if (isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
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
  }, [undo, redo, isLocked]);

  const handleSave = useCallback(async () => {
    if (isLocked) return;
    setIsSaving(true);
    try {
      const updated = await updatePlan(localPlan.id, {
        researchGoal,
        objectives,
        researchQuestions,
        targetRespondents,
        proposedSections
      });
      if (updated) {
        setLocalPlan(updated);
        onPlanUpdate(updated);
        // Update last saved state
        lastSavedRef.current = JSON.stringify({
          researchGoal,
          objectives,
          researchQuestions,
          targetRespondents,
          proposedSections
        });
        toast.success('Plan saved', {
          description: 'Your changes have been saved.'
        });
      }
    } catch {
      toast.error('Failed to save', {
        description: 'Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    isLocked,
    localPlan.id,
    researchGoal,
    objectives,
    researchQuestions,
    targetRespondents,
    proposedSections,
    onPlanUpdate
  ]);

  const handleAIGenerate = useCallback(async () => {
    if (isLocked) {
      toast.error('Plan locked', {
        description:
          'Survey questions already exist. This plan can no longer be regenerated.'
      });
      return;
    }
    const goal = researchGoal.trim();
    if (!goal) {
      toast.error('Research goal required', {
        description: 'Enter a research goal before generating with AI.'
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Single request: update goal + hard-replace all AI fields on the server.
      const { plan: refreshed, output } = await generatePlanWithAI(
        localPlan.id,
        goal
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
      lastSavedRef.current = JSON.stringify(nextState);
      setLocalPlan(refreshed);
      onPlanUpdate(refreshed);

      toast.success('Plan regenerated', {
        description:
          output.notes ??
          'Previous plan content was replaced with a fresh AI draft.'
      });
    } catch {
      toast.error('Generation failed', {
        description: 'AI could not generate the plan. Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isLocked, localPlan.id, researchGoal, replacePlanState, onPlanUpdate]);

  const proceedToBuilder = useCallback(
    async (saveChanges: boolean) => {
      setShowUnsavedDialog(false);

      // Questions already exist — open Review only (plan is immutable).
      if (isLocked) {
        const targetSurveyId =
          surveyId ?? linkedSurvey?.id ?? localPlan.linkedSurveyId;
        if (targetSurveyId) {
          router.push(`/dashboard/surveys/${targetSurveyId}/review`);
          return;
        }
        toast.error('Survey not found', {
          description: 'Could not open Review for this plan.'
        });
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
              displaySurveyTitle(researchGoal) || 'Untitled survey'
            );

        queryClient.setQueryData(surveyKeys.detail(survey.id), survey);
        // Hard-replace clears reviewer reports on the API — don't keep stale findings.
        queryClient.setQueryData(reviewerKeys.latest(survey.id), null);

        toast.success('Survey draft ready', {
          description: 'Review and edit questions before publishing.'
        });
        router.push(`/dashboard/surveys/${survey.id}/review`);
      } catch (err) {
        toast.error('Failed to generate survey', {
          description:
            err instanceof Error && err.message
              ? err.message
              : 'Please try again.'
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
      isLocked,
      linkedSurvey?.id,
      localPlan.linkedSurveyId,
      onPlanUpdate,
      router,
      surveyId,
      queryClient
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
      label: 'Research goal',
      done: researchGoal.trim().length >= 10
    },
    {
      id: 'objectives',
      label: 'Objectives',
      done: objectives.length > 0,
      count: objectives.length
    },
    {
      id: 'questions',
      label: 'Research questions',
      done: researchQuestions.length > 0,
      count: researchQuestions.length
    },
    {
      id: 'respondents',
      label: 'Target respondents',
      done: targetRespondents.length > 0,
      count: targetRespondents.length
    },
    {
      id: 'sections',
      label: 'Proposed sections',
      done: proposedSections.length > 0,
      count: proposedSections.length
    }
  ];
  const readinessDone = readiness.filter((item) => item.done).length;
  const readinessTotal = readiness.length;
  const unsaved = hasUnsavedChanges();
  const canGenerateSurvey = hasContent && researchGoal.trim().length >= 10;

  return (
    <div className='space-y-5'>
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-4 lg:col-span-2'>
          <SurvaiPanel>
            <SurvaiPanelHeader
              // icon={<Icons.plan className='size-3.5' />}
              className='border-b border-[color-mix(in_srgb,var(--primary)_70%,var(--foreground))] bg-primary [&_[data-slot=panel-icon]]:border-[color-mix(in_srgb,var(--primary-foreground)_28%,transparent)] [&_[data-slot=panel-icon]]:bg-primary-foreground/12 [&_[data-slot=panel-icon]]:text-primary-foreground [&_[data-slot=panel-icon]]:shadow-none'
              title={
                <div className='min-w-0'>
                  <h3 className='font-display text-2xl font-extrabold tracking-tight text-primary-foreground sm:text-2xl'>
                    Research plan
                  </h3>
                  <p className='mt-0.5 text-sm leading-snug text-primary-foreground/80'>
                    What this survey is trying to learn
                  </p>
                </div>
              }
              badge={
                <span className='font-mono text-[11px] tabular-nums text-primary-foreground/80'>
                  {researchGoal.trim().length.toLocaleString()} chars
                </span>
              }
            />
            <SurvaiPanelBody>
              {isLocked ? (
                <p className='rounded-xl border border-[color-mix(in_srgb,var(--brand)_28%,var(--border))] bg-brand-soft/50 px-4 py-4 text-base font-semibold leading-relaxed text-foreground sm:text-lg'>
                  <ResearchGoalDisplay text={researchGoal} />
                </p>
              ) : (
                <Textarea
                  value={researchGoal}
                  onChange={(e) =>
                    setPlanState((prev) => ({
                      ...prev,
                      researchGoal: e.target.value
                    }))
                  }
                  rows={4}
                  className='border-border min-h-[7rem] resize-none rounded-xl border-2 text-base font-semibold leading-relaxed text-foreground focus-visible:border-[color-mix(in_srgb,var(--brand)_55%,var(--foreground))] sm:text-lg'
                  placeholder='Describe the purpose of your survey…'
                />
              )}
              <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
                A clear goal guides objectives, questions, audiences, and
                sections. Regenerate with AI after edits if you want a fresh
                draft.
              </p>
            </SurvaiPanelBody>
          </SurvaiPanel>

          <SurvaiPanel>
            <SurvaiPanelHeader
              icon={<Icons.checks className='size-3.5' />}
              title='Objectives'
              subtitle='Outcomes this survey should achieve'
              badge={<CountBadge count={objectives.length} />}
            />
            <SurvaiPanelBody>
              <EditableList
                items={objectives}
                onChange={(newObjectives) =>
                  setPlanState((prev) => ({
                    ...prev,
                    objectives: newObjectives
                  }))
                }
                placeholder='e.g. Understand primary health concerns…'
                addLabel='Add objective'
                emptyMessage='No objectives yet'
                disabled={isLocked}
              />
            </SurvaiPanelBody>
          </SurvaiPanel>

          <SurvaiPanel>
            <SurvaiPanelHeader
              icon={<Icons.forms className='size-3.5' />}
              title='Research questions'
              subtitle='Questions the survey should answer'
              badge={<CountBadge count={researchQuestions.length} />}
            />
            <SurvaiPanelBody>
              <EditableList
                items={researchQuestions}
                onChange={(newQuestions) =>
                  setPlanState((prev) => ({
                    ...prev,
                    researchQuestions: newQuestions
                  }))
                }
                placeholder='e.g. What conditions do households report most?'
                addLabel='Add question'
                emptyMessage='No research questions yet'
                disabled={isLocked}
              />
            </SurvaiPanelBody>
          </SurvaiPanel>

          <SurvaiPanel>
            <SurvaiPanelHeader
              icon={<Icons.teams className='size-3.5' />}
              title='Target respondents'
              subtitle='Who should take this survey'
              badge={<CountBadge count={targetRespondents.length} />}
            />
            <SurvaiPanelBody>
              <EditableList
                items={targetRespondents}
                onChange={(newRespondents) =>
                  setPlanState((prev) => ({
                    ...prev,
                    targetRespondents: newRespondents
                  }))
                }
                placeholder='e.g. Household heads aged 18–65…'
                addLabel='Add audience'
                emptyMessage='No target respondents yet'
                disabled={isLocked}
              />
            </SurvaiPanelBody>
          </SurvaiPanel>

          <SurvaiPanel>
            <SurvaiPanelHeader
              icon={<Icons.kanban className='size-3.5' />}
              title='Proposed sections'
              subtitle='How questions will be grouped in the survey'
              badge={<CountBadge count={proposedSections.length} />}
            />
            <SurvaiPanelBody>
              <ProposedSectionsEditor
                sections={proposedSections}
                onChange={(newSections) =>
                  setPlanState((prev) => ({
                    ...prev,
                    proposedSections: newSections
                  }))
                }
                disabled={isLocked}
              />
            </SurvaiPanelBody>
          </SurvaiPanel>
        </div>

        <div className='sticky top-[4.5rem] self-start space-y-4'>
          <div className='space-y-4 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft p-4 sm:p-5'>
            <div>
              <p className='font-display text-lg font-extrabold tracking-tight text-foreground'>
                {isLocked ? 'Plan locked' : canGenerateSurvey ? 'Ready when you are' : 'Finish the brief'}
              </p>
              <p className='text-muted-foreground mt-1 text-sm leading-relaxed'>
                {isLocked
                  ? 'Questions already exist for this plan. Continue on Review to edit them.'
                  : canGenerateSurvey
                    ? 'AI will draft survey questions from this plan. You can edit everything next.'
                    : 'Add a goal plus at least one list item before generating questions.'}
              </p>
            </div>

            <ul className='space-y-1.5'>
              {readiness.map((item) => (
                <li
                  key={item.id}
                  className='flex items-center gap-2.5 rounded-xl bg-card/70 px-2.5 py-2 ring-1 ring-border/70'
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-lg',
                      item.done
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {item.done ? (
                      <Icons.check className='size-3.5' strokeWidth={2.5} />
                    ) : (
                      <span className='size-1.5 rounded-full bg-current opacity-50' />
                    )}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 text-sm',
                      item.done
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                  {typeof item.count === 'number' ? (
                    <span className='font-mono text-[10px] tabular-nums text-muted-foreground'>
                      {item.count}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>

            <Button
              type='button'
              className={blackCtaClass}
              onClick={handleProceedToBuilder}
              disabled={isCreatingSurvey || (!isLocked && !canGenerateSurvey)}
            >
              {isCreatingSurvey ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' />
                  Generating…
                </>
              ) : isLocked ? (
                <>
                  <Icons.review className='size-4' />
                  Continue to Review
                  <Icons.arrowRight className='ml-auto size-4' />
                </>
              ) : (
                <>
                  <Icons.sparkles className='size-4' />
                  Generate survey questions
                  <Icons.arrowRight className='ml-auto size-4' />
                </>
              )}
            </Button>
          </div>

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
        </div>
      </div>

      <Dialog
        open={isGenerating}
        onOpenChange={(next) => {
          if (!next && isGenerating) return;
        }}
      >
        <DialogContent
          className='sm:max-w-2xl gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none'
          showCloseButton={false}
        >
          <DialogTitle className='sr-only'>Generating survey plan</DialogTitle>
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
          className='sm:max-w-md gap-0 overflow-hidden p-0'
          showCloseButton={false}
        >
          <DialogHeader className='border-b border-[color-mix(in_srgb,var(--primary)_70%,var(--foreground))] bg-primary px-5 py-4'>
            <DialogTitle className='text-primary-foreground'>
              Generating survey questions
            </DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-4'>
            <SurveyGenerationProgress
              active={isCreatingSurvey}
              goalPreview={researchGoal}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className='sm:max-w-md gap-0 overflow-hidden p-0'>
          <DialogHeader className='border-b border-border bg-brand-soft px-5 py-4 text-foreground'>
            <DialogTitle>Save your changes?</DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-2'>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              You have unsaved changes to your survey plan. Save them before
              generating questions, or discard and continue.
            </p>
          </div>
          <Separator />
          <div className='flex items-center justify-end gap-2 px-4 py-3'>
            <Button variant='outline' onClick={() => proceedToBuilder(false)}>
              Discard changes
            </Button>
            <Button
              className='bg-foreground text-background hover:bg-foreground/90'
              onClick={() => proceedToBuilder(true)}
            >
              Save & proceed
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
