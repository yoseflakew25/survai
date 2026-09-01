'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { newSurveySchema, type NewSurveyValues } from '../schemas/survey.schema';

interface NewSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Goal' },
  { id: 3, label: 'Preview' }
];

export function NewSurveyDialog({ open, onOpenChange }: NewSurveyDialogProps) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    reset,
    formState: { errors }
  } = useForm<NewSurveyValues>({
    resolver: zodResolver(newSurveySchema),
    defaultValues: {
      title: '',
      description: '',
      researchGoal: '',
      startMethod: 'ai'
    }
  });

  const title = watch('title');
  const description = watch('description');
  const researchGoal = watch('researchGoal');

  const titleLength = title?.length ?? 0;
  const goalLength = researchGoal?.length ?? 0;

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setIsGenerating(false);
      reset();
    }, 200);
  }, [onOpenChange, reset]);

  const handleNext = useCallback(async () => {
    if (step === 1) {
      const valid = await trigger('title');
      if (!valid) return;
    }
    setStep((s) => Math.min(3, s + 1));
  }, [step, trigger]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const handleGenerate = useCallback(
    async (values: NewSurveyValues) => {
      setIsGenerating(true);
      await new Promise((r) => setTimeout(r, 3000));
      const surveyId = `sur_${Date.now()}`;
      toast.success('Survey plan generated!', {
        description: `"${values.title}" has been created with AI-generated sections and questions.`
      });
      setIsGenerating(false);
      handleClose();
      router.push(`/dashboard/surveys/${surveyId}/build`);
    },
    [handleClose, router]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg gap-0 p-0 overflow-hidden'>
        {/* Header */}
        <DialogHeader>
          <DialogTitle className='text-xl font-semibold'>Create New Survey</DialogTitle>
          <DialogDescription>
            Set up your survey in a few steps. You can always edit later.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className='px-6 pt-4'>
          <div className='flex items-center gap-1'>
            {STEPS.map((s, i) => (
              <div key={s.id} className='flex flex-1 items-center'>
                <div className='flex items-center gap-2'>
                  <div
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                      step > s.id
                        ? 'bg-primary text-primary-foreground'
                        : step === s.id
                          ? 'bg-primary/20 text-primary ring-2 ring-primary/30'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {step > s.id ? <Icons.check className='size-3' /> : s.id}
                  </div>
                  <span
                    className={cn(
                      'hidden text-xs font-medium sm:block',
                      step === s.id ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-px flex-1 transition-colors',
                      step > s.id ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className='flex-1 overflow-y-auto px-6 py-5 min-h-[280px]'>
          {/* Step 1: Details */}
          {step === 1 && (
            <div className='space-y-4 animate-in fade-in slide-in-from-right-2 duration-200'>
              <div className='space-y-1'>
                <h3 className='text-sm font-semibold'>Survey Details</h3>
                <p className='text-muted-foreground text-xs'>
                  Give your survey a clear, descriptive name.
                </p>
              </div>
              <Field>
                <FieldLabel>
                  Title <span className='text-destructive'>*</span>
                </FieldLabel>
                <Input
                  placeholder='e.g., Community Health Assessment 2026'
                  autoFocus
                  aria-invalid={!!errors.title}
                  {...register('title')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNext();
                    }
                  }}
                />
                <FieldDescription>{titleLength}/200 characters</FieldDescription>
                {errors.title && <FieldError>{errors.title.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  placeholder='Briefly describe what this survey is about and who it is for...'
                  rows={3}
                  className='resize-none'
                  {...register('description')}
                />
                <FieldDescription>
                  {(description?.length ?? 0)}/500 characters.
                </FieldDescription>
              </Field>
            </div>
          )}

          {/* Step 2: Research Goal */}
          {step === 2 && (
            <div className='space-y-4 animate-in fade-in slide-in-from-right-2 duration-200'>
              <div className='space-y-1'>
                <h3 className='text-sm font-semibold'>Research Goal</h3>
                <p className='text-muted-foreground text-xs'>
                  Describe what you want to learn. The AI will use this to generate objectives,
                  questions, and sections.
                </p>
              </div>
              <Field>
                <FieldLabel>Research Goal</FieldLabel>
                <Textarea
                  placeholder='e.g., Assess the health status and healthcare access of residents in DICDO target communities...'
                  rows={5}
                  className='resize-none'
                  {...register('researchGoal')}
                />
                <FieldDescription>
                  {goalLength}/2,000 characters. Be specific for better AI output.
                </FieldDescription>
              </Field>
              <div className='rounded-lg border border-dashed bg-muted/30 p-3'>
                <div className='flex items-start gap-2'>
                  <Icons.sparkles className='text-primary mt-0.5 size-4 shrink-0' />
                  <div className='text-xs'>
                    <p className='font-medium'>AI will generate:</p>
                    <ul className='text-muted-foreground mt-1 space-y-0.5'>
                      <li>• Research objectives aligned to your goal</li>
                      <li>• Target respondent types</li>
                      <li>• Proposed survey sections with rationale</li>
                      <li>• Draft questions for each section</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className='space-y-4 animate-in fade-in slide-in-from-right-2 duration-200'>
              <div className='space-y-1'>
                <h3 className='text-sm font-semibold'>Preview & Generate</h3>
                <p className='text-muted-foreground text-xs'>
                  Review your survey setup before AI generates the plan.
                </p>
              </div>
              <div className='rounded-lg border space-y-3 p-4'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-semibold truncate'>
                      {title || 'Untitled Survey'}
                    </p>
                    {description && (
                      <p className='text-muted-foreground mt-0.5 text-xs truncate'>
                        {description}
                      </p>
                    )}
                  </div>
                  <Badge variant='secondary'>Draft</Badge>
                </div>
              </div>
              {researchGoal && (
                <div className='space-y-2'>
                  <p className='text-xs font-medium text-muted-foreground'>Research Goal</p>
                  <div className='bg-muted/50 rounded-md p-3 text-xs leading-relaxed'>
                    {researchGoal.length > 300
                      ? `${researchGoal.slice(0, 300)}...`
                      : researchGoal}
                  </div>
                </div>
              )}
              {!researchGoal && (
                <div className='rounded-lg border border-dashed p-4 text-center'>
                  <p className='text-muted-foreground text-xs'>
                    No research goal provided. Go back to add one for better AI results.
                  </p>
                </div>
              )}
              <div className='bg-primary/5 rounded-lg border border-primary/20 p-3'>
                <div className='flex items-start gap-2'>
                  <Icons.sparkles className='text-primary mt-0.5 size-4 shrink-0' />
                  <div className='text-xs'>
                    <p className='font-medium'>What happens next:</p>
                    <ol className='text-muted-foreground mt-1 space-y-0.5 list-decimal list-inside'>
                      <li>Survey is created with your details</li>
                      <li>AI generates sections, questions, and objectives</li>
                      <li>You review and edit in the builder</li>
                      <li>Publish when ready to collect responses</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer — no form wrapping this */}
        <div className='border-t px-6 py-4 flex items-center justify-between'>
          <div>
            {step > 1 && (
              <Button type='button' variant='ghost' onClick={handleBack}>
                <Icons.chevronLeft className='mr-1 h-3.5 w-3.5' />
                Back
              </Button>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Button type='button' variant='ghost' onClick={handleClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button type='button' onClick={handleNext}>
                Continue
                <Icons.chevronRight className='ml-1 h-3.5 w-3.5' />
              </Button>
            ) : (
              <Button
                type='button'
                disabled={isGenerating}
                onClick={() => handleSubmit(handleGenerate)()}
              >
                {isGenerating ? (
                  <>
                    <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                    Generating Plan…
                  </>
                ) : (
                  <>
                    <Icons.sparkles className='mr-2 h-4 w-4' />
                    Generate Survey Plan
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
