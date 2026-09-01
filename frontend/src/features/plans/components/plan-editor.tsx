'use client';

import { useCallback, useState } from 'react';
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
import { toast } from 'sonner';
import type { Plan, ProposedSection } from '../api/types';
import { generatePlanWithAI, updatePlan } from '../api/service';
import { EditableList } from './editable-list';
import { ProposedSectionsEditor } from './proposed-sections-editor';

interface PlanEditorProps {
  plan: Plan;
  onPlanUpdate: (plan: Plan) => void;
}

export function PlanEditor({ plan, onPlanUpdate }: PlanEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);

  // Local state for editable fields
  const [researchGoal, setResearchGoal] = useState(localPlan.researchGoal);
  const [objectives, setObjectives] = useState(localPlan.objectives);
  const [researchQuestions, setResearchQuestions] = useState(localPlan.researchQuestions);
  const [targetRespondents, setTargetRespondents] = useState(localPlan.targetRespondents);
  const [proposedSections, setProposedSections] = useState<ProposedSection[]>(
    localPlan.proposedSections
  );

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

      // Merge AI output into local state
      setObjectives(output.objectives);
      setResearchQuestions(output.researchQuestions);
      setTargetRespondents(output.targetRespondents);
      setProposedSections(output.proposedSections);

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
  }, [localPlan.id, researchGoal, onPlanUpdate]);

  const handleApprove = useCallback(async () => {
    setIsSaving(true);
    try {
      const updated = await updatePlan(localPlan.id, { status: 'approved' });
      if (updated) {
        setLocalPlan(updated);
        onPlanUpdate(updated);
        toast.success('Plan approved', {
          description: 'This plan is now ready to be used in the survey builder.'
        });
      }
    } catch {
      toast.error('Failed to approve', {
        description: 'Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  }, [localPlan.id, onPlanUpdate]);

  const hasContent =
    objectives.length > 0 ||
    researchQuestions.length > 0 ||
    targetRespondents.length > 0 ||
    proposedSections.length > 0;

  return (
    <div className='grid gap-6 lg:grid-cols-3'>
      {/* Main content area */}
      <div className='space-y-6 lg:col-span-2'>
        {/* Research Goal */}
        <Card>
          <CardHeader>
            <div className='flex items-start justify-between gap-2'>
              <div>
                <CardTitle className='text-base'>Research Goal</CardTitle>
                <CardDescription>
                  Describe what you want to learn and why it matters
                </CardDescription>
              </div>
              <Badge variant={localPlan.status === 'approved' ? 'default' : 'secondary'}>
                {localPlan.status === 'approved' ? 'Approved' : 'Draft'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={researchGoal}
              onChange={(e) => setResearchGoal(e.target.value)}
              rows={4}
              className='resize-none'
              placeholder='Describe the purpose of your survey...'
            />
          </CardContent>
        </Card>

        {/* Objectives */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Objectives</CardTitle>
            <CardDescription>
              What specific outcomes will this survey help achieve?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditableList
              items={objectives}
              onChange={setObjectives}
              placeholder='e.g., Understand the primary health concerns...'
              addLabel='Add objective'
              emptyMessage='No objectives yet. Generate with AI or add manually.'
            />
          </CardContent>
        </Card>

        {/* Research Questions */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Research Questions</CardTitle>
            <CardDescription>
              What specific questions should the survey answer?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditableList
              items={researchQuestions}
              onChange={setResearchQuestions}
              placeholder='e.g., What are the most prevalent health conditions...'
              addLabel='Add question'
              emptyMessage='No research questions yet. Generate with AI or add manually.'
            />
          </CardContent>
        </Card>

        {/* Target Respondents */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Target Respondents</CardTitle>
            <CardDescription>
              Who should participate in this survey?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditableList
              items={targetRespondents}
              onChange={setTargetRespondents}
              placeholder='e.g., Household heads aged 18-65...'
              addLabel='Add respondent type'
              emptyMessage='No target respondents defined. Generate with AI or add manually.'
            />
          </CardContent>
        </Card>

        {/* Proposed Sections */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Proposed Sections</CardTitle>
            <CardDescription>
              High-level sections that will organize your survey questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProposedSectionsEditor
              sections={proposedSections}
              onChange={setProposedSections}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className='space-y-6'>
        {/* AI Generation */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>AI Assistant</CardTitle>
            <CardDescription>
              Generate a structured plan from your research goal
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Button
              className='w-full'
              onClick={handleAIGenerate}
              disabled={isGenerating || !researchGoal.trim()}
            >
              {isGenerating ? (
                <>
                  <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                  Generating…
                </>
              ) : (
                <>
                  <Icons.sparkles className='mr-2 h-4 w-4' />
                  Generate with AI
                </>
              )}
            </Button>
            {isGenerating && (
              <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                <Icons.spinner className='h-3 w-3 animate-spin' />
                Analyzing your research goal…
              </div>
            )}
            <p className='text-muted-foreground text-xs'>
              The AI will generate objectives, research questions, target
              respondents, and proposed sections based on your research goal.
            </p>
          </CardContent>
        </Card>

        <Separator />

        {/* Plan Details */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Plan Details</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Objectives</span>
              <span className='font-medium'>{objectives.length}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Research Questions</span>
              <span className='font-medium'>{researchQuestions.length}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Target Respondents</span>
              <span className='font-medium'>{targetRespondents.length}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Sections</span>
              <span className='font-medium'>{proposedSections.length}</span>
            </div>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Estimated Length</span>
              <span className='font-medium'>
                {localPlan.estimatedLengthMinutes
                  ? `${localPlan.estimatedLengthMinutes} min`
                  : '—'}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Status</span>
              <Badge variant={localPlan.status === 'approved' ? 'default' : 'secondary'}>
                {localPlan.status === 'approved' ? 'Approved' : 'Draft'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Actions</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
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
              Save Changes
            </Button>
            {localPlan.status === 'draft' && hasContent && (
              <Button
                className='w-full'
                onClick={handleApprove}
                disabled={isSaving}
              >
                <Icons.badgeCheck className='mr-2 h-4 w-4' />
                Approve Plan
              </Button>
            )}
            {localPlan.status === 'approved' && (
              <Button
                className='w-full'
                onClick={() => {
                  toast.info('Coming soon', {
                    description: 'Survey builder integration will be available next.'
                  });
                }}
              >
                <Icons.page className='mr-2 h-4 w-4' />
                Create Survey from Plan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* AI Generation Meta */}
        {localPlan.aiGenerationMeta && (
          <Card>
            <CardHeader>
              <CardTitle className='text-xs'>AI Generation Info</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-xs text-muted-foreground'>
              <div className='flex justify-between'>
                <span>Model</span>
                <span className='font-mono'>{localPlan.aiGenerationMeta.model}</span>
              </div>
              <div className='flex justify-between'>
                <span>Prompt version</span>
                <span className='font-mono'>
                  {localPlan.aiGenerationMeta.promptVersion}
                </span>
              </div>
              <div className='flex justify-between'>
                <span>Latency</span>
                <span className='font-mono'>
                  {localPlan.aiGenerationMeta.latencyMs}ms
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
