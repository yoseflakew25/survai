'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import type { SurveyDraftOutput } from '../api/types';
import { generateSurveyDraft } from '../api/service';

interface AIGenerationPanelProps {
  surveyId: string;
  planId: string | null;
  onApply: (output: SurveyDraftOutput) => void;
}

export function AIGenerationPanel({ surveyId, planId, onApply }: AIGenerationPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<SurveyDraftOutput | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const output = await generateSurveyDraft(surveyId);
      setGeneratedOutput(output);
      toast.success('AI generation complete', {
        description: `Generated ${output.sections.length} sections. Review and apply.`
      });
    } catch {
      toast.error('Generation failed', {
        description: 'Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [surveyId]);

  const handleApply = useCallback(() => {
    if (generatedOutput) {
      onApply(generatedOutput);
      setGeneratedOutput(null);
      setPrompt('');
    }
  }, [generatedOutput, onApply]);

  return (
    <div className='rounded-lg border bg-background p-4'>
      <div className='mb-3 flex items-center gap-2'>
        <div className='bg-primary/10 flex h-7 w-7 items-center justify-center rounded-md'>
          <Icons.sparkles className='text-primary h-4 w-4' />
        </div>
        <h3 className='text-sm font-semibold'>AI Assistant</h3>
      </div>

      <p className='text-muted-foreground mb-3 text-xs'>
        Generate questions and sections based on your research goal.
      </p>

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder='Describe what questions to generate...'
        className='mb-3 min-h-[80px] resize-none text-xs'
      />

      <Button
        className='w-full'
        size='default'
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
            Generating...
          </>
        ) : (
          <>
            <Icons.sparkles className='mr-2 h-4 w-4' />
            Generate with AI
          </>
        )}
      </Button>

      {generatedOutput && (
        <div className='mt-4 space-y-3'>
          <div className='rounded-md bg-primary/5 p-3'>
            <p className='text-xs font-medium'>Generated Content</p>
            <p className='text-muted-foreground mt-1 text-xs'>
              {generatedOutput.sections.length} sections with{' '}
              {generatedOutput.sections.reduce((sum, s) => sum + s.questions.length, 0)} questions
            </p>
          </div>

          <div className='space-y-2'>
            {generatedOutput.sections.map((section, i) => (
              <div key={i} className='rounded-md border p-2'>
                <p className='text-xs font-medium'>{section.title}</p>
                <p className='text-muted-foreground text-[10px]'>
                  {section.questions.length} questions
                </p>
              </div>
            ))}
          </div>

          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='flex-1'
              onClick={() => setGeneratedOutput(null)}
            >
              Discard
            </Button>
            <Button size='sm' className='flex-1' onClick={handleApply}>
              Apply to Survey
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
