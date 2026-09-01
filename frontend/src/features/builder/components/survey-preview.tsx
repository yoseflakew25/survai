'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Icons } from '@/components/icons';
import type { Survey } from '../api/types';
import { getQuestionTypeMeta } from '../api/types';

interface SurveyPreviewProps {
  survey: Survey;
}

export function SurveyPreview({ survey }: SurveyPreviewProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const sections = survey.sections;

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center py-12'>
          <Icons.eyeOff className='text-muted-foreground mb-3 h-8 w-8' />
          <p className='text-muted-foreground text-sm'>
            Add sections and questions to see a preview
          </p>
        </CardContent>
      </Card>
    );
  }

  const section = sections[currentSection];
  const totalQuestions = sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  );
  const answeredQuestions = 0; // Preview only

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-base'>Survey Preview</CardTitle>
            <CardDescription>
              How respondents will see your survey
            </CardDescription>
          </div>
          <Badge variant='outline'>
            Section {currentSection + 1} of {sections.length}
          </Badge>
        </div>

        {/* Section tabs */}
        <div className='flex gap-1 overflow-x-auto pt-2'>
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentSection(i)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                i === currentSection
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Progress */}
        <div className='space-y-1'>
          <div className='flex justify-between text-xs text-muted-foreground'>
            <span>
              {answeredQuestions} of {totalQuestions} questions
            </span>
            <span>
              {totalQuestions > 0
                ? Math.round((answeredQuestions / totalQuestions) * 100)
                : 0}
              %
            </span>
          </div>
          <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
            <div
              className='bg-primary h-full transition-all'
              style={{
                width: `${
                  totalQuestions > 0
                    ? (answeredQuestions / totalQuestions) * 100
                    : 0
                }%`
              }}
            />
          </div>
        </div>

        {/* Section header */}
        <div>
          <h3 className='text-sm font-semibold'>{section.title}</h3>
          {section.description && (
            <p className='text-muted-foreground mt-0.5 text-xs'>
              {section.description}
            </p>
          )}
        </div>

        {/* Questions */}
        {section.questions.map((question) => {
          const typeMeta = getQuestionTypeMeta(question.type);

          return (
            <div key={question.id} className='space-y-2'>
              <div className='flex items-start gap-1'>
                <p className='text-sm font-medium'>{question.promptText}</p>
                {question.isRequired && (
                  <span className='text-destructive text-xs'>*</span>
                )}
              </div>

              {question.helpText && (
                <p className='text-muted-foreground text-xs'>
                  {question.helpText}
                </p>
              )}

              {/* Type-specific preview */}
              {question.type === 'short_text' && (
                <Input disabled placeholder='Short text answer' className='h-9 text-sm' />
              )}

              {question.type === 'long_text' && (
                <Textarea
                  disabled
                  placeholder='Long text answer'
                  rows={3}
                  className='resize-none text-sm'
                />
              )}

              {question.type === 'single_choice' && question.options && (
                <RadioGroup disabled className='space-y-1.5'>
                  {question.options.map((opt) => (
                    <div key={opt.id} className='flex items-center gap-2'>
                      <RadioGroupItem value={opt.value} />
                      <span className='text-sm'>{opt.label}</span>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {question.type === 'multiple_choice' && question.options && (
                <div className='space-y-1.5'>
                  {question.options.map((opt) => (
                    <div key={opt.id} className='flex items-center gap-2'>
                      <Checkbox disabled />
                      <span className='text-sm'>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {question.type === 'dropdown' && question.options && (
                <select
                  disabled
                  className='border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm opacity-50'
                >
                  <option>Select an option...</option>
                  {question.options.map((opt) => (
                    <option key={opt.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {question.type === 'rating_scale' &&
                question.validationRules && (
                  <div className='flex items-center gap-2'>
                    <span className='text-muted-foreground text-xs'>
                      {question.validationRules.min ?? 1}
                    </span>
                    <div className='flex gap-1'>
                      {Array.from(
                        {
                          length:
                            (question.validationRules.max ?? 5) -
                            (question.validationRules.min ?? 1) +
                            1
                        },
                        (_, i) => (question.validationRules?.min ?? 1) + i
                      ).map((n) => (
                        <button
                          key={n}
                          disabled
                          className='bg-muted flex size-8 items-center justify-center rounded-md border text-xs font-medium opacity-50'
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className='text-muted-foreground text-xs'>
                      {question.validationRules.max ?? 5}
                    </span>
                  </div>
                )}

              {question.type === 'number' && (
                <Input
                  disabled
                  type='number'
                  placeholder='0'
                  className='h-9 w-32 text-sm'
                />
              )}

              {question.type === 'date' && (
                <Input disabled type='date' className='h-9 w-48 text-sm' />
              )}
            </div>
          );
        })}

        {/* Navigation */}
        <div className='flex items-center justify-between pt-2'>
          <Button
            variant='outline'
            
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
          >
            <Icons.chevronLeft className='mr-1 h-3.5 w-3.5' />
            Previous
          </Button>
          <Button
            
            onClick={() =>
              setCurrentSection(
                Math.min(sections.length - 1, currentSection + 1)
              )
            }
            disabled={currentSection === sections.length - 1}
          >
            Next
            <Icons.chevronRight className='ml-1 h-3.5 w-3.5' />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
