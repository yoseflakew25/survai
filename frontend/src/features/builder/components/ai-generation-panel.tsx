'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { generateSurveyDraft } from '../api/service';
import type { SurveyDraftOutput, DraftSection } from '../api/types';

interface AIGenerationPanelProps {
  surveyId: string;
  planId: string | null;
  onApply: (output: SurveyDraftOutput) => void;
}

export function AIGenerationPanel({
  surveyId,
  planId,
  onApply
}: AIGenerationPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<SurveyDraftOutput | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const output = await generateSurveyDraft(surveyId);
      setPreview(output);
      setIsExpanded(true);
      toast.success('Draft generated', {
        description: `Generated ${output.sections.length} sections. Review and apply.`
      });
    } catch {
      toast.error('Generation failed', {
        description: 'AI could not generate the survey draft.'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [surveyId]);

  const handleApply = useCallback(() => {
    if (!preview) return;
    onApply(preview);
    setPreview(null);
    setIsExpanded(false);
    toast.success('Draft applied', {
      description: 'The AI-generated sections have been added to your survey.'
    });
  }, [preview, onApply]);

  const totalQuestions = preview?.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  ) ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <CardTitle className='text-base'>AI Builder</CardTitle>
            <CardDescription>
              {planId
                ? 'Generate a survey draft from the approved plan'
                : 'Link a plan first to enable AI generation'}
            </CardDescription>
          </div>
          {preview && (
            <Badge variant='secondary'>
              {preview.sections.length} sections · {totalQuestions} questions
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        <Button
          className='w-full'
          onClick={handleGenerate}
          disabled={isGenerating || !planId}
        >
          {isGenerating ? (
            <>
              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
              Generating draft…
            </>
          ) : (
            <>
              <Icons.sparkles className='mr-2 h-4 w-4' />
              {preview ? 'Regenerate' : 'Generate Survey Draft'}
            </>
          )}
        </Button>

        {isGenerating && (
          <div className='text-muted-foreground flex items-center gap-2 text-xs'>
            <Icons.spinner className='h-3 w-3 animate-spin' />
            Analyzing plan and generating question drafts…
          </div>
        )}

        {/* Preview */}
        {preview && isExpanded && (
          <>
            <Separator />
            <div className='space-y-3'>
              <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                Preview — {preview.sections.length} sections
              </p>
              {preview.sections.map((section, i) => (
                <DraftSectionPreview key={i} section={section} index={i} />
              ))}
              <div className='flex gap-2 pt-2'>
                <Button onClick={handleApply} >
                  <Icons.check className='mr-1 h-3.5 w-3.5' />
                  Apply to Survey
                </Button>
                <Button
                  variant='ghost'
                  
                  onClick={() => setIsExpanded(false)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </>
        )}

        {!planId && (
          <p className='text-muted-foreground text-xs text-center'>
            Approve a plan in the Plans module to enable AI generation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DraftSectionPreview({
  section,
  index
}: {
  section: DraftSection;
  index: number;
}) {
  return (
    <div className='rounded-lg border p-3 space-y-2'>
      <div className='flex items-center gap-2'>
        <span className='text-muted-foreground text-xs font-medium'>
          {index + 1}.
        </span>
        <span className='text-sm font-medium'>{section.title}</span>
        <Badge variant='outline' className='text-[10px]'>
          {section.questions.length} questions
        </Badge>
      </div>
      <ul className='space-y-1 pl-5'>
        {section.questions.map((q, qi) => (
          <li key={qi} className='text-muted-foreground text-xs list-disc'>
            {q.promptText}
          </li>
        ))}
      </ul>
    </div>
  );
}
