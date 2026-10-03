'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { surveyByIdOptions, surveyKeys } from '@/features/builder/api/queries';
import { latestReviewOptions } from '../api/queries';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SurveyStepper } from '@/components/survey-stepper';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { QualityScore } from './quality-score';
import { updateQuestion } from '@/features/builder/api/service';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import type { ReviewerReport } from '../api/types';
import type { Survey, Section, Question, QuestionType, QuestionOption } from '@/features/builder/api/types';
import { getQuestionTypeMeta, QUESTION_TYPES } from '@/features/builder/api/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ReviewerViewProps {
  surveyId: string;
}

interface GenerationStep {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

export function ReviewerView({ surveyId }: ReviewerViewProps) {
  return <ReviewerContent surveyId={surveyId} />;
}

function ReviewerContent({ surveyId }: { surveyId: string }) {
  const { data: survey } = useSuspenseQuery(surveyByIdOptions(surveyId));
  const { data: report } = useSuspenseQuery(latestReviewOptions(surveyId));
  const [localReport, setLocalReport] = useState(report);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { id: 1, label: 'Analyzing survey structure', status: 'pending' },
    { id: 2, label: 'Reviewing question clarity', status: 'pending' },
    { id: 3, label: 'Checking for biases', status: 'pending' },
    { id: 4, label: 'Evaluating logical flow', status: 'pending' },
    { id: 5, label: 'Generating findings report', status: 'pending' }
  ]);

  // Simulate AI generation when survey has no sections
  useEffect(() => {
    if (survey && survey.sections.length === 0 && !isGenerating) {
      setIsGenerating(true);
      
      const runGeneration = async () => {
        for (let i = 0; i < generationSteps.length; i++) {
          setGenerationSteps(prev => prev.map((step, idx) => ({
            ...step,
            status: idx === i ? 'active' : idx < i ? 'completed' : 'pending'
          })));
          await new Promise(r => setTimeout(r, 800));
        }
        
        setGenerationSteps(prev => prev.map(step => ({
          ...step,
          status: 'completed'
        })));
        
        await new Promise(r => setTimeout(r, 500));
        setIsGenerating(false);
      };
      
      runGeneration();
    }
  }, [survey, isGenerating, generationSteps.length]);

  if (!survey) {
    notFound();
  }

  // Show loading state during AI generation
  if (isGenerating) {
    return (
      <div className='space-y-4'>
        {/* Progress indicator */}
        <div className='relative overflow-hidden rounded-xl border border-primary/20 bg-primary'>
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
          <div className='relative p-6 text-center'>
            <div className='bg-primary-foreground/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full'>
              <Icons.sparkles className='text-primary-foreground h-8 w-8 animate-pulse' />
            </div>
            <h2 className='text-primary-foreground mb-2 text-xl font-semibold'>
              Generating Your Survey
            </h2>
            <p className='text-primary-foreground/80 text-sm'>
              AI is analyzing and creating your survey questions...
            </p>
          </div>
        </div>

        {/* Generation steps */}
        <div className='mx-auto max-w-md space-y-3'>
          {generationSteps.map((step) => (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 transition-all',
                step.status === 'active' && 'border-primary/30 bg-primary/5',
                step.status === 'completed' && 'border-success-border bg-success-muted'
              )}
            >
              <div className='shrink-0'>
                {step.status === 'completed' ? (
                  <div className='bg-success-strong flex h-6 w-6 items-center justify-center rounded-full'>
                    <Icons.check className='h-4 w-4 text-white' />
                  </div>
                ) : step.status === 'active' ? (
                  <Icons.spinner className='text-primary h-5 w-5 animate-spin' />
                ) : (
                  <div className='h-6 w-6 rounded-full border-2 border-gray-300' />
                )}
              </div>
              <span className={cn(
                'text-sm',
                step.status === 'active' && 'font-medium text-primary',
                step.status === 'completed' && 'text-success-muted-foreground'
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <p className='text-muted-foreground text-center text-xs'>
          This usually takes 10-15 seconds
        </p>
      </div>
    );
  }

  const totalQuestions = survey.sections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <>
    <AlertModal
      isOpen={deleteOpen}
      onClose={() => setDeleteOpen(false)}
      onConfirm={() => {
        setDeleteOpen(false);
        toast.success('Survey deleted');
      }}
      loading={false}
      title='Delete Survey'
      description='Are you sure you want to delete this survey? This action cannot be undone.'
      confirmLabel='Delete'
    />
    <div className='space-y-4'>
      {/* Survey Header */}
      <div className='flex items-end justify-between gap-6  border-b pb-4'>
        <div className='min-w-0'>
          <h1 className='text-2xl font-bold tracking-tight text-primary dark:text-white'>{survey.title}</h1>
          {survey.description && (
            <p className='text-muted-foreground text-sm'>{survey.description}</p>
          )}
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <Button variant='outline' className='text-primary'>
            <Icons.sparkles className='mr-1.5 h-3.5 w-3.5' />
            Regenerate
          </Button>
          <Button variant='destructive'  onClick={() => setDeleteOpen(true)}>
            <Icons.trash className='mr-1.5 h-3.5 w-3.5' />
            Delete
          </Button>
         
          <Button variant='outline' >
            <Icons.review className='mr-1.5 h-3.5 w-3.5' />
            Review with AI
          </Button>
           <Button variant='default' >
            <Icons.check className='mr-1.5 h-3.5 w-3.5' />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Progress indicator */}
      <SurveyStepper
        currentStep={3}
        badge={
          <Badge variant='secondary'>
            {survey.status === 'published' || survey.status === 'closed'
              ? 'Published'
              : 'Draft'}
          </Badge>
        }
      />

      <div className='grid gap-6 lg:grid-cols-[1fr_340px]'>
        {/* Main content */}
        <div className='space-y-4'>
          <div className='space-y-4'>
            {survey.sections.map((section, sIdx) => (
              <SectionReviewCard
                key={section.id}
                section={section}
                index={sIdx}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className='sticky top-[4.5rem] self-start space-y-6'>
          {/* Primary Action - Continue to Collect */}
          <div className='relative overflow-hidden rounded-xl border border-primary/20 bg-primary'>
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
                <h3 className='text-lg font-semibold text-primary-foreground'>
                  Ready to Collect?
                </h3>
                <p className='text-primary-foreground/80 text-sm leading-relaxed'>
                  Review the AI findings and proceed to collect responses
                </p>
              </div>
              <Link href={`/dashboard/surveys/${surveyId}/collect`} className='w-full'>
                <Button
                  className='w-full'
                  size='lg'
                  variant='secondary'
                >
                  Publish the Survey
                  <Icons.arrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
             
            </div>
          </div>

          <Separator />

          {/* Quality Score */}
          {localReport && (
            <QualityScore
              score={localReport.overallQualityScore}
              criteria={localReport.scoreCriteria}
              estimatedMinutes={localReport.estimatedCompletionMinutes}
              requiredQuestionCount={localReport.requiredQuestionCount}
            />
          )}


          
        </div>
      </div>
    </div>
    </>
  );
}

// Section Review Card Component
function SectionReviewCard({ section, index }: { section: Section; index: number }) {
  return (
    <div className='rounded-lg border bg-background'>
      <div className='border-b bg-muted/30 px-4 py-3'>
        <div className='flex items-center gap-3'>
          <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded text-xs font-bold'>
            {index + 1}
          </span>
          <div>
            <h3 className='font-semibold'>{section.title}</h3>
            {section.description && (
              <p className='text-muted-foreground text-xs'>{section.description}</p>
            )}
          </div>
          <Badge variant='secondary' className='ml-auto text-xs'>
            {section.questions.length} questions
          </Badge>
        </div>
      </div>
      <div className='divide-y'>
        {section.questions.map((question, qIdx) => (
          <QuestionReviewItem
            key={question.id}
            question={question}
            index={qIdx}
          />
        ))}
      </div>
    </div>
  );
}

// Question Review Item Component
function QuestionReviewItem({ question, index }: { question: Question; index: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(question.promptText);
  const [editHelpText, setEditHelpText] = useState(question.helpText ?? '');
  const [editOptions, setEditOptions] = useState<QuestionOption[]>(question.options ?? []);
  const [editType, setEditType] = useState<QuestionType>(question.type);
  const [editIsRequired, setEditIsRequired] = useState(question.isRequired);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const typeMeta = getQuestionTypeMeta(editType);
  const TypeIcon = Icons[typeMeta.icon as keyof typeof Icons];

  const sourceBadge =
    question.source === 'ai_generated'
      ? { label: 'AI', className: 'bg-primary/10 text-primary' }
      : question.source === 'ai_edited'
        ? { label: 'AI+', className: 'bg-primary/10 text-primary' }
        : { label: 'Manual', className: 'bg-muted text-muted-foreground' };

  const hasChanges =
    editPrompt !== question.promptText ||
    editHelpText !== (question.helpText ?? '') ||
    editType !== question.type ||
    editIsRequired !== question.isRequired ||
    JSON.stringify(editOptions) !== JSON.stringify(question.options ?? []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateQuestion(question.id, {
        promptText: editPrompt.trim() || question.promptText,
        helpText: editHelpText.trim() || null,
        type: editType,
        isRequired: editIsRequired,
        options: editType === 'single_choice' || editType === 'multiple_choice' || editType === 'dropdown'
          ? editOptions.length > 0 ? editOptions : undefined
          : null
      });
      queryClient.invalidateQueries({ queryKey: surveyKeys.detail(question.surveyId) });
      setIsEditing(false);
      toast.success('Question updated');
    } catch {
      toast.error('Failed to update question');
    } finally {
      setIsSaving(false);
    }
  }, [question.id, question.promptText, question.surveyId, editPrompt, editHelpText, editType, editIsRequired, editOptions, queryClient]);

  const handleCancel = useCallback(() => {
    setEditPrompt(question.promptText);
    setEditHelpText(question.helpText ?? '');
    setEditOptions(question.options ?? []);
    setEditType(question.type);
    setEditIsRequired(question.isRequired);
    setIsEditing(false);
  }, [question]);

  const handleTypeChange = useCallback((newType: QuestionType) => {
    setEditType(newType);
    // Add default options if switching to an options-based type
    const newMeta = getQuestionTypeMeta(newType);
    if (newMeta.hasOptions && editOptions.length === 0) {
      setEditOptions([
        { id: `opt_new_1`, label: 'Option 1', value: 'option_1' },
        { id: `opt_new_2`, label: 'Option 2', value: 'option_2' }
      ]);
    }
  }, [editOptions.length]);

  const addOption = useCallback(() => {
    setEditOptions(prev => [
      ...prev,
      { id: `opt_new_${Date.now()}`, label: `Option ${prev.length + 1}`, value: `option_${prev.length + 1}` }
    ]);
  }, []);

  const updateOption = useCallback((optId: string, label: string) => {
    setEditOptions(prev => prev.map(opt =>
      opt.id === optId ? { ...opt, label, value: label.toLowerCase().replace(/\s+/g, '_') } : opt
    ));
  }, []);

  const removeOption = useCallback((optId: string) => {
    setEditOptions(prev => prev.filter(opt => opt.id !== optId));
  }, []);

  return (
    <div className={cn('group flex items-start gap-3 px-4 py-3 transition-colors', isEditing && 'bg-primary/5')}>
      <span className='text-muted-foreground mt-0.5 text-xs font-medium'>
        {index + 1}.
      </span>
      <div className='flex-1 space-y-2'>
        {/* Type and source badges */}
        <div className='flex items-center gap-2'>
          {isEditing ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant='outline'  className='h-6 text-xs' />}>
                {TypeIcon && <TypeIcon className='mr-1 h-3 w-3' />}
                {typeMeta.label}
                <Icons.chevronDown className='ml-1 h-3 w-3' />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-48'>
                {QUESTION_TYPES.map((qt) => {
                  const Icon = Icons[qt.icon as keyof typeof Icons];
                  return (
                    <DropdownMenuItem
                      key={qt.type}
                      onClick={() => handleTypeChange(qt.type)}
                      className='flex items-center gap-2'
                    >
                      {Icon && <Icon className='h-3.5 w-3.5' />}
                      <span>{qt.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {TypeIcon && <TypeIcon className='h-3.5 w-3.5' />}
              <span className='text-xs'>{typeMeta.label}</span>
            </>
          )}

          {isEditing ? (
            <div className='flex items-center gap-1.5'>
              <Switch
                checked={editIsRequired}
                onCheckedChange={setEditIsRequired}
                className='scale-75'
              />
              <span className='text-xs'>{editIsRequired ? 'Required' : 'Optional'}</span>
            </div>
          ) : (
            question.isRequired && (
              <span className='text-destructive text-xs'>*Required</span>
            )
          )}

          <Badge
            variant='secondary'
            className={cn('ml-auto text-[10px]', sourceBadge.className)}
          >
            {sourceBadge.label}
          </Badge>
        </div>

        {/* Question text editing */}
        {isEditing ? (
          <div className='space-y-2'>
            <Input
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              className='h-8 text-sm font-medium'
              placeholder='Question text'
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <Input
              value={editHelpText}
              onChange={(e) => setEditHelpText(e.target.value)}
              className='h-7 text-xs'
              placeholder='Help text (optional)'
            />
          </div>
        ) : (
          <>
            <p className='text-sm font-medium'>{question.promptText}</p>
            {question.helpText && (
              <p className='text-muted-foreground text-xs'>{question.helpText}</p>
            )}
          </>
        )}

        {/* Options editing */}
        {isEditing && (editType === 'single_choice' || editType === 'multiple_choice' || editType === 'dropdown') && (
          <div className='space-y-2 rounded-md border border-dashed p-2'>
            <p className='text-muted-foreground text-[10px] font-medium uppercase'>Options</p>
            <div >
              {editOptions.map((opt) => (
                <div key={opt.id} className='flex items-center gap-2'>
                  <span className='text-muted-foreground w-4 text-center text-[10px]'>•</span>
                  <Input
                    value={opt.label}
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    className='h-7 flex-1 text-xs'
                    placeholder='Option label'
                  />
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    className='h-6 w-6 text-muted-foreground hover:text-destructive'
                    onClick={() => removeOption(opt.id)}
                  >
                    <Icons.close className='h-3 w-3' />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant='ghost'  className='h-7 text-xs' onClick={addOption}>
              <Icons.add className='mr-1 h-3 w-3' />
              Add Option
            </Button>
          </div>
        )}

        {/* Options display (not editing) */}
        {!isEditing && question.options && question.options.length > 0 && (
          <div className='mt-2 flex flex-wrap gap-1'>
            {question.options.map((opt) => (
              <Badge key={opt.id} variant='outline' className='text-[10px]'>
                {opt.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Rating scale display */}
        {question.type === 'rating_scale' && question.validationRules && !isEditing && (
          <Badge variant='outline' className='mt-1 text-[10px]'>
            Scale: {question.validationRules.min} - {question.validationRules.max}
          </Badge>
        )}

        {/* Edit actions */}
        {isEditing && (
          <div className='flex items-center gap-2 pt-1'>
            <Button size='sm' onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? <Icons.spinner className='mr-1 h-3 w-3 animate-spin' /> : <Icons.check className='mr-1 h-3 w-3' />}
              Save
            </Button>
            <Button size='sm' variant='ghost' onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Edit button */}
      {!isEditing && (
        <Button
          variant='ghost'
          size='icon-sm'
          className='mt-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100'
          onClick={() => setIsEditing(true)}
        >
          <Icons.edit className='h-3.5 w-3.5' />
        </Button>
      )}
    </div>
  );
}

