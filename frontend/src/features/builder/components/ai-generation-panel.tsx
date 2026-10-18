'use client';

import { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import type { Survey } from '../api/types';
import { generateSurveyDraft } from '../api/service';
import { SurveyGenerationProgress } from './survey-generation-progress';

interface AIGenerationPanelProps {
  surveyId: string;
  planId: string | null;
  goalPreview?: string;
  /** Called with the persisted survey after a hard-replace generate. */
  onApplied: (survey: Survey) => void;
}

export function AIGenerationPanel({
  surveyId,
  planId,
  goalPreview,
  onApplied
}: AIGenerationPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!planId) {
      toast.error('No linked plan', {
        description:
          'Link a research plan before regenerating the survey draft.'
      });
      return;
    }

    setConfirmOpen(false);
    setIsGenerating(true);
    try {
      const survey = await generateSurveyDraft(surveyId);
      // Same survey id; sections/questions hard-replaced — no merge with prior draft.
      onApplied(survey);
      toast.success('Survey regenerated', {
        description: `Replaced with ${survey.sections.length} sections from your plan.`
      });
    } catch (err) {
      toast.error('Generation failed', {
        description:
          err instanceof Error && err.message
            ? err.message
            : 'Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [surveyId, planId, onApplied]);

  return (
    <>
      <div className='rounded-lg border bg-background p-4'>
        <div className='mb-3 flex items-center gap-2'>
          <div className='bg-primary/10 flex h-7 w-7 items-center justify-center rounded-md'>
            <Icons.sparkles className='text-primary h-4 w-4' />
          </div>
          <h3 className='text-sm font-semibold'>AI Assistant</h3>
        </div>

        <p className='text-muted-foreground mb-3 text-xs leading-relaxed'>
          Regenerate the full questionnaire from the linked research plan. This
          permanently replaces existing sections and questions.
        </p>

        <Button
          className='w-full'
          size='default'
          onClick={() => setConfirmOpen(true)}
          disabled={isGenerating || !planId}
        >
          {isGenerating ? (
            <>
              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
              Regenerating…
            </>
          ) : (
            <>
              <Icons.sparkles className='mr-2 h-4 w-4' />
              Regenerate with AI
            </>
          )}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className='sm:max-w-md gap-0 overflow-hidden p-0'>
          <DialogHeader className='bg-primary'>
            <DialogTitle>Regenerate survey questions?</DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-2'>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              This permanently replaces every section and question on this
              survey with a new AI draft from the linked plan. The survey id
              stays the same — previous questions are not kept or merged.
            </p>
          </div>
          <Separator />
          <div className='flex items-center justify-end gap-2 px-4 py-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setConfirmOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => void handleGenerate()}
              disabled={isGenerating || !planId}
            >
              <Icons.sparkles className='size-4' />
              Replace &amp; regenerate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>Generating survey questions</DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-4'>
            <SurveyGenerationProgress
              active={isGenerating}
              goalPreview={goalPreview}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
