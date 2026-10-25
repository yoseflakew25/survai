'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  SurvaiBrandCard,
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { displaySurveyTitle } from '@/lib/survey-display';

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

const brandCtaOnLimeClass =
  'h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--foreground)_14%,transparent)] bg-card font-semibold text-foreground shadow-sm hover:bg-card/90';

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

  const planSteps = [
    { n: 1, label: 'Plan created', state: 'complete' as const },
    { n: 2, label: 'Review & edit', state: 'current' as const },
    { n: 3, label: 'Generate survey', state: 'upcoming' as const }
  ];

  return (
    <div className='space-y-5'>
      {/* Progress strip only on standalone plan pages — survey hub already has the pill nav. */}
      {!surveyId ? (
        <ol
          aria-label='Plan progress'
          className='flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:gap-0 sm:px-4 sm:py-3'
        >
          {planSteps.map((step, i) => {
            const complete = step.state === 'complete';
            const current = step.state === 'current';
            return (
              <li
                key={step.n}
                className='flex min-w-0 flex-1 items-center gap-2 sm:gap-3'
              >
                <div className='flex min-w-0 items-center gap-2.5'>
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                      complete &&
                        'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_12%,transparent)]',
                      current &&
                        'bg-foreground text-background shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)]',
                      !complete &&
                        !current &&
                        'border border-border bg-muted/60 text-muted-foreground'
                    )}
                  >
                    {complete ? (
                      <Icons.check className='size-3.5' strokeWidth={2.5} />
                    ) : (
                      step.n
                    )}
                  </span>
                  <span
                    className={cn(
                      'truncate text-sm font-medium',
                      current && 'font-semibold text-foreground',
                      complete && 'text-foreground',
                      !complete && !current && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < planSteps.length - 1 ? (
                  <span
                    className={cn(
                      'mx-1 hidden h-px flex-1 sm:block',
                      complete ? 'bg-foreground/25' : 'bg-border'
                    )}
                    aria-hidden
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main content area */}
        <div className='space-y-4 lg:col-span-2'>
          <SurvaiPanel>
            <SurvaiPanelHeader
              icon={<Icons.sparkles className='size-3.5' />}
              title='Research goal'
              subtitle='What this survey is trying to learn'
              badge={
                <Badge
                  variant='secondary'
                  className='rounded-full border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-brand-soft text-[10px] font-semibold'
                >
                  {isLocked ? 'Locked' : 'AI draft'}
                </Badge>
              }
            />
            <SurvaiPanelBody>
              <Textarea
                value={researchGoal}
                onChange={(e) =>
                  setPlanState((prev) => ({
                    ...prev,
                    researchGoal: e.target.value
                  }))
                }
                rows={4}
                readOnly={isLocked}
                disabled={isLocked}
                className='border-border min-h-[7rem] resize-none rounded-xl border-2 text-sm leading-relaxed focus-visible:border-[color-mix(in_srgb,var(--brand)_55%,var(--foreground))] disabled:cursor-default disabled:opacity-100'
                placeholder='Describe the purpose of your survey…'
              />
              <p className='text-muted-foreground mt-3 text-[11px] tabular-nums'>
                {researchGoal.trim().length.toLocaleString()} characters
              </p>
            </SurvaiPanelBody>
          </SurvaiPanel>

          <SurvaiPanel>
            <SurvaiPanelHeader
              icon={<Icons.checks className='size-3.5' />}
              title='Objectives'
              subtitle='Outcomes this survey should achieve'
              badge={
                <span className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                  {objectives.length}
                </span>
              }
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
              badge={
                <span className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                  {researchQuestions.length}
                </span>
              }
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
              badge={
                <span className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                  {targetRespondents.length}
                </span>
              }
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
              badge={
                <span className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                  {proposedSections.length}
                </span>
              }
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

        {/* Sidebar */}
        <div className='sticky top-[4.5rem] self-start space-y-4'>
          <SurvaiBrandCard
            title={isLocked ? 'Plan locked' : 'Ready to generate?'}
            description={
              isLocked
                ? 'Questions were generated from this plan. View it here anytime — edit questions on Review.'
                : 'AI will draft survey questions from this plan. You can review and edit everything next.'
            }
          >
            <Button
              type='button'
              className={brandCtaOnLimeClass}
              onClick={handleProceedToBuilder}
              disabled={isCreatingSurvey || !hasContent}
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
          </SurvaiBrandCard>

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
            hasUnsavedChanges={hasUnsavedChanges()}
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
          className='sm:max-w-md gap-0 overflow-hidden p-0'
          showCloseButton={false}
        >
          <DialogHeader className='bg-primary'>
            <DialogTitle>Generating survey plan</DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-4'>
            <PlanGenerationProgress
              active={isGenerating}
              goalPreview={researchGoal}
            />
          </div>
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
          <DialogHeader className='bg-primary'>
            <DialogTitle>Generating survey questions</DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-4'>
            <SurveyGenerationProgress
              active={isCreatingSurvey}
              goalPreview={researchGoal}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className='sm:max-w-md gap-0 p-0 overflow-hidden'>
          <DialogHeader className='bg-primary'>
            <DialogTitle>Save your changes?</DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-2'>
            <p className='text-sm text-muted-foreground'>
              You have unsaved changes to your survey plan. Would you like to save them before proceeding to the builder?
            </p>
          </div>
          <Separator />
          <div className='px-4 py-3 flex items-center justify-end gap-2'>
            <Button variant='outline' onClick={() => proceedToBuilder(false)}>
              Discard Changes
            </Button>
            <Button onClick={() => proceedToBuilder(true)}>
              Save & Proceed
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
