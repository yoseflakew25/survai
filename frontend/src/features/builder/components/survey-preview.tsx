'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { Section } from '../api/types';
import { getQuestionTypeMeta } from '../api/types';

interface SurveyPreviewProps {
  title: string;
  sections: Section[];
}

export function SurveyPreview({ title, sections }: SurveyPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <div className='rounded-lg border bg-background p-4'>
      <div className='mb-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='bg-primary/10 flex h-7 w-7 items-center justify-center rounded-md'>
            <Icons.eyeOff className='text-primary h-4 w-4' />
          </div>
          <h3 className='text-sm font-semibold'>Preview</h3>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      <div className='space-y-3'>
        <div className='rounded-md bg-muted/50 p-3'>
          <p className='text-sm font-medium'>{title || 'Untitled Survey'}</p>
          <p className='text-muted-foreground mt-1 text-xs'>
            {sections.length} sections · {totalQuestions} questions
          </p>
        </div>

        {isExpanded && (
          <div className='max-h-[300px] space-y-3 overflow-y-auto'>
            {sections.map((section, i) => (
              <div key={section.id} className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <span className='bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold'>
                    {i + 1}
                  </span>
                  <p className='text-xs font-medium'>{section.title}</p>
                </div>
                <div className='ml-7 space-y-1.5'>
                  {section.questions.map((question) => {
                    const meta = getQuestionTypeMeta(question.type);
                    const TypeIcon = Icons[meta.icon as keyof typeof Icons];
                    return (
                      <div
                        key={question.id}
                        className='flex items-start gap-1.5 text-xs'
                      >
                        {TypeIcon && (
                          <TypeIcon className='text-muted-foreground mt-0.5 h-3 w-3 shrink-0' />
                        )}
                        <div>
                          <p className='leading-relaxed'>{question.promptText}</p>
                          {question.isRequired && (
                            <Badge variant='secondary' className='mt-0.5 text-[9px]'>
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isExpanded && (
          <div className='space-y-1'>
            {sections.slice(0, 2).map((section) => (
              <div key={section.id} className='flex items-center gap-2 text-xs'>
                <Icons.chevronRight className='text-muted-foreground h-3 w-3' />
                <span className='text-muted-foreground'>{section.title}</span>
                <span className='text-muted-foreground/60'>
                  ({section.questions.length})
                </span>
              </div>
            ))}
            {sections.length > 2 && (
              <p className='text-muted-foreground/60 pl-5 text-xs'>
                +{sections.length - 2} more sections
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
