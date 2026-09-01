'use client';

import { useCallback, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { surveyByIdOptions } from '../api/queries';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import type { Survey, Section, SurveyDraftOutput } from '../api/types';
import { SectionManager } from './section-manager';
import { AIGenerationPanel } from './ai-generation-panel';
import { SurveyPreview } from './survey-preview';
import { updateSurveyTitle } from '../api/service';

interface BuilderViewProps {
  surveyId: string;
}

export function BuilderView({ surveyId }: BuilderViewProps) {
  return <BuilderContent surveyId={surveyId} />;
}

function BuilderContent({ surveyId }: { surveyId: string }) {
  const { data: survey, refetch } = useSuspenseQuery(surveyByIdOptions(surveyId));
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(survey?.title ?? '');

  if (!survey) {
    notFound();
  }

  const handleSectionsChange = useCallback(
    (sections: Section[]) => {
      // In a real app, this would update via mutation
      // For now we just refetch
      refetch();
    },
    [refetch]
  );

  const handleAIGenerateApply = useCallback(
    (output: SurveyDraftOutput) => {
      // In a real app, this would call an API to merge the AI output
      // For now, refetch to show the mock data
      refetch();
    },
    [refetch]
  );

  const handleSaveTitle = useCallback(async () => {
    if (!title.trim()) return;
    await updateSurveyTitle(surveyId, title.trim());
    setIsEditingTitle(false);
    refetch();
    toast.success('Title updated');
  }, [title, surveyId, refetch]);

  const totalQuestions = survey.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  );

  return (
    <div className='grid gap-6 lg:grid-cols-3'>
      {/* Main content — sections */}
      <div className='space-y-4 lg:col-span-2'>
        {/* Survey header */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-start justify-between gap-2'>
              <div className='flex-1'>
                {isEditingTitle ? (
                  <div className='flex items-center gap-2'>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className='text-base font-semibold border-b border-primary bg-transparent outline-none flex-1'
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') {
                          setTitle(survey.title);
                          setIsEditingTitle(false);
                        }
                      }}
                    />
                    <Button  onClick={handleSaveTitle}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className='flex items-center gap-2'>
                    <CardTitle className='text-base'>
                      {survey.title}
                    </CardTitle>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      onClick={() => setIsEditingTitle(true)}
                    >
                      <Icons.edit className='h-3.5 w-3.5' />
                    </Button>
                  </div>
                )}
              </div>
              <div className='flex items-center gap-2'>
                <Badge variant={survey.status === 'draft' ? 'secondary' : 'default'}>
                  {survey.status}
                </Badge>
                <Badge variant='outline'>
                  {survey.sections.length} sections · {totalQuestions} questions
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Sections with DnD */}
        <SectionManager
          surveyId={surveyId}
          sections={survey.sections}
          onSectionsChange={handleSectionsChange}
        />
      </div>

      {/* Sidebar */}
      <div className='space-y-6'>
        {/* AI Generation */}
        <AIGenerationPanel
          surveyId={surveyId}
          planId={survey.planId}
          onApply={handleAIGenerateApply}
        />

        <Separator />

        {/* Preview */}
        <SurveyPreview survey={survey} />

        <Separator />

        {/* Quick stats */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Survey Stats</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Sections</span>
              <span className='font-medium'>{survey.sections.length}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Questions</span>
              <span className='font-medium'>{totalQuestions}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>AI-generated</span>
              <span className='font-medium'>
                {survey.sections.reduce(
                  (sum, s) =>
                    sum +
                    s.questions.filter((q) => q.source === 'ai_generated').length,
                  0
                )}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Manual</span>
              <span className='font-medium'>
                {survey.sections.reduce(
                  (sum, s) =>
                    sum + s.questions.filter((q) => q.source === 'manual').length,
                  0
                )}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Required</span>
              <span className='font-medium'>
                {survey.sections.reduce(
                  (sum, s) =>
                    sum + s.questions.filter((q) => q.isRequired).length,
                  0
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
