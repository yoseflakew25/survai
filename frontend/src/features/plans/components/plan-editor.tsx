'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import type { Plan, ProposedSection } from '../api/types';
import { generatePlanWithAI, updatePlan } from '../api/service';
import { createSurveyFromPlan } from '@/features/builder/api/service';
import { useRouter } from 'next/navigation';
import { EditableList } from './editable-list';
import { ProposedSectionsEditor } from './proposed-sections-editor';
import { useUndoRedo } from '@/hooks/use-undo-redo';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface PlanEditorProps {
  plan: Plan;
  onPlanUpdate: (plan: Plan) => void;
}

interface PlanState {
  researchGoal: string;
  objectives: string[];
  researchQuestions: string[];
  targetRespondents: string[];
  proposedSections: ProposedSection[];
}

export function PlanEditor({ plan, onPlanUpdate }: PlanEditorProps) {
  const router = useRouter();
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
    undo,
    redo,
    canUndo,
    canRedo
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

  // Keyboard shortcuts
  useEffect(() => {
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
  }, [undo, redo]);

  const handleSave = useCallback(async () => {
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
  }, [localPlan.id, researchGoal, objectives, researchQuestions, targetRespondents, proposedSections, onPlanUpdate]);

  const handleAIGenerate = useCallback(async () => {
    if (!researchGoal.trim()) {
      toast.error('Research goal required', {
        description: 'Enter a research goal before generating with AI.'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const output = await generatePlanWithAI(localPlan.id);

      // Update state with AI output
      setPlanState({
        researchGoal,
        objectives: output.objectives,
        researchQuestions: output.researchQuestions,
        targetRespondents: output.targetRespondents,
        proposedSections: output.proposedSections
      });

      // Also persist the update
      const updated = await updatePlan(localPlan.id, {
        researchGoal,
        objectives: output.objectives,
        researchQuestions: output.researchQuestions,
        targetRespondents: output.targetRespondents,
        proposedSections: output.proposedSections,
        estimatedLengthMinutes: output.estimatedLengthMinutes
      });
      if (updated) {
        setLocalPlan(updated);
        onPlanUpdate(updated);
      }

      toast.success('Plan generated', {
        description: output.notes ?? 'AI has generated objectives, questions, and sections for your plan.'
      });
    } catch {
      toast.error('Generation failed', {
        description: 'AI could not generate the plan. Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [localPlan.id, researchGoal, setPlanState, onPlanUpdate]);

  const handleProceedToBuilder = useCallback(async () => {
    // Check for unsaved changes and show dialog if needed
    if (hasUnsavedChanges()) {
      setShowUnsavedDialog(true);
      return;
    }
    
    await proceedToBuilder(false);
  }, [hasUnsavedChanges]);

  const proceedToBuilder = useCallback(async (saveChanges: boolean) => {
    setShowUnsavedDialog(false);
    setIsCreatingSurvey(true);
    
    try {
      // Save changes if requested
      if (saveChanges) {
        await updatePlan(localPlan.id, {
          researchGoal,
          objectives,
          researchQuestions,
          targetRespondents,
          proposedSections
        });
      }

      // Create survey from plan and generate questions with AI
      const survey = await createSurveyFromPlan(
        localPlan.id,
        localPlan.researchGoal.slice(0, 80)
      );
      
      toast.success('Generating survey questions', {
        description: 'AI is generating your survey questions. This may take a moment...'
      });
      
      // Navigate to the review page
      router.push(`/dashboard/surveys/${survey.id}/review`);
    } catch {
      toast.error('Failed to proceed', {
        description: 'Please try again.'
      });
    } finally {
      setIsCreatingSurvey(false);
    }
  }, [localPlan.id, researchGoal, objectives, researchQuestions, targetRespondents, proposedSections, router]);

  const hasContent =
    objectives.length > 0 ||
    researchQuestions.length > 0 ||
    targetRespondents.length > 0 ||
    proposedSections.length > 0;

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='grid items-center gap-4 lg:grid-cols-5'>
        <div className='min-w-0  lg:col-span-2'>
          <h1 className='text-2xl font-bold tracking-tight text-primary dark:text-white'>Review Survey Plan</h1>
          <p className='text-muted-foreground text-sm'>
            Review and refine your AI-generated plan before building the survey
          </p>
        </div>
        <Card className='bg-primary/5 border-primary/20 lg:col-span-3'>
          <CardContent className='flex items-center gap-3 px-3'>
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold'>
                ✓
              </span>
              <span className='text-sm font-medium'>Plan Created</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-3 w-3' />
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold'>
                2
              </span>
              <span className='text-sm font-medium'>Review & Edit</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-3 w-3' />
            <div className='flex items-center gap-2'>
              <span className='bg-muted text-muted-foreground flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold'>
                3
              </span>
              <span className='text-muted-foreground text-sm'>Review & Collect</span>
            </div>
            <Separator orientation='vertical' className='ml-auto mr-1 h-5' />
            <div className='flex items-center gap-2'>
              {hasUnsavedChanges() && (
                <Badge variant='outline' className='border-amber-500 text-amber-600 text-[10px]'>
                  Unsaved Changes
                </Badge>
              )}
              <Badge variant={localPlan.status === 'approved' ? 'default' : 'secondary'} className='text-[10px]'>
                {localPlan.status === 'approved' ? 'Ready to Build' : 'Draft'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main content area */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Research Goal */}
          <Card>
            <CardHeader>
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <CardTitle className='text-primary font-semibold'>Research Goal</CardTitle>
                  <CardDescription>
                    Review the AI-generated research goal or refine it
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={researchGoal}
                onChange={(e) =>
                  setPlanState((prev) => ({ ...prev, researchGoal: e.target.value }))
                }
                rows={4}
                className='resize-none'
                placeholder='Describe the purpose of your survey...'
              />
            </CardContent>
          </Card>

          {/* Objectives */}
          <Card>
            <CardHeader>
              <CardTitle className='text-primary font-semibold'>Objectives</CardTitle>
              <CardDescription>
                Review, edit, or add objectives that this survey will achieve
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditableList
                items={objectives}
                onChange={(newObjectives) =>
                  setPlanState((prev) => ({ ...prev, objectives: newObjectives }))
                }
                placeholder='e.g., Understand the primary health concerns...'
                addLabel='Add objective'
                emptyMessage='No objectives yet. Generate with AI or add manually.'
              />
            </CardContent>
          </Card>

          {/* Research Questions */}
          <Card>
            <CardHeader>
              <CardTitle className='text-primary font-semibold'>Research Questions</CardTitle>
              <CardDescription>
                Review, edit, or add questions the survey should answer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditableList
                items={researchQuestions}
                onChange={(newQuestions) =>
                  setPlanState((prev) => ({ ...prev, researchQuestions: newQuestions }))
                }
                placeholder='e.g., What are the most prevalent health conditions...'
                addLabel='Add question'
                emptyMessage='No research questions yet. Generate with AI or add manually.'
              />
            </CardContent>
          </Card>

          {/* Target Respondents */}
          <Card>
            <CardHeader>
              <CardTitle className='text-primary font-semibold'>Target Respondents</CardTitle>
              <CardDescription>
                Review or define who should participate in this survey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditableList
                items={targetRespondents}
                onChange={(newRespondents) =>
                  setPlanState((prev) => ({ ...prev, targetRespondents: newRespondents }))
                }
                placeholder='e.g., Household heads aged 18-65...'
                addLabel='Add respondent type'
                emptyMessage='No target respondents defined. Generate with AI or add manually.'
              />
            </CardContent>
          </Card>

          {/* Proposed Sections */}
          <Card>
            <CardHeader>
              <CardTitle className='text-primary font-semibold'>Proposed Sections</CardTitle>
              <CardDescription>
                Review, reorder, or add sections that organize your survey questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProposedSectionsEditor
                sections={proposedSections}
                onChange={(newSections) =>
                  setPlanState((prev) => ({ ...prev, proposedSections: newSections }))
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className='sticky top-[4.5rem] self-start space-y-6'>
          {/* Primary Action - Proceed to Review */}
          <div className='relative overflow-hidden rounded-xl border border-primary/20 bg-primary'>
            {/* Grid pattern overlay */}
            <div
              className='pointer-events-none absolute inset-0'
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                maskImage: 'linear-gradient(to right, transparent, black 30%, black 70%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%, black 70%, transparent)'
              }}
            />
            <div className='relative space-y-4 p-5'>
              <div >
                <h3 className='text-lg font-semibold text-primary-foreground'>Ready to Generate?</h3>
                <p className='text-primary-foreground/80 text-sm leading-relaxed'>
                  AI will generate survey questions based on your plan. You can review and edit them.
                </p>
              </div>
              <Button
                className='w-full'
                size='lg'
                variant='secondary'
                onClick={handleProceedToBuilder}
                disabled={isCreatingSurvey || !hasContent}
              >
                {isCreatingSurvey ? (
                  <>
                    <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Icons.sparkles className='mr-2 h-4 w-4' />
                    Generate Survey Questions
                    <Icons.chevronRight className='ml-2 h-4 w-4' />
                  </>
                )}
              </Button>
             
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className='text-primary font-semibold'>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              {/* Undo/Redo buttons */}
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='default'
                  className='flex-1'
                  onClick={undo}
                  disabled={!canUndo}
                >
                  <Icons.chevronsLeft className='mr-1 h-4 w-4' />
                  Undo
                </Button>
                <Button
                  variant='outline'
                  size='default'
                  className='flex-1'
                  onClick={redo}
                  disabled={!canRedo}
                >
                  Redo
                  <Icons.chevronsRight className='ml-1 h-4 w-4' />
                </Button>
              </div>

              <Button
                className='w-full'
                variant='outline'
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Icons.check className='mr-2 h-4 w-4' />
                )}
                Save Progress
              </Button>
            </CardContent>
          </Card>

          <Separator />

         

          
        </div>
      </div>

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
