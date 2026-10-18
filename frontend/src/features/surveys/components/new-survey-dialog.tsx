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
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { newSurveySchema, type NewSurveyValues } from '../schemas/survey.schema';
import { createPlanWithAI } from '@/features/plans/api/service';

interface NewSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { id: 1, label: 'Details', icon: Icons.page },
  { id: 2, label: 'Goal', icon: Icons.sparkles },
  { id: 3, label: 'Preview', icon: Icons.eyeOff }
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

  // Trigger validation for step 2 to show errors

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
    } else if (step === 2) {
      const valid = await trigger('researchGoal');
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
      try {
        const plan = await createPlanWithAI(
          { researchGoal: values.researchGoal },
          (step, _progress) => {
            // Progress steps handled by the button loading state
            console.log(step);
          }
        );
        toast.success('Survey plan generated!', {
          description: `"${values.title}" has been created with AI-generated sections and questions.`
        });
        handleClose();
        router.push(`/dashboard/plans/${plan.id}`);
      } catch {
        toast.error('Generation failed', {
          description: 'Please try again.'
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [handleClose, router]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='gap-0 overflow-hidden rounded-2xl border-border p-0 sm:max-w-lg'>
        {/* Header */}
        <DialogHeader>
          <DialogTitle className='font-display text-xl font-extrabold tracking-tight'>
            Create New Survey
          </DialogTitle>
          <DialogDescription>
            Set up your survey in a few steps. You can always edit later.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className='px-6 pt-4 '>
          <div className='flex items-center justify-center gap-1'>
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              return (
                <div key={s.id} className='flex flex-1 items-center justify-center'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200',
                        step > s.id
                          ? 'bg-foreground text-background'
                          : step === s.id
                            ? 'bg-brand-soft text-foreground ring-2 ring-[color-mix(in_srgb,var(--brand)_45%,transparent)]'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {step > s.id ? (
                        <Icons.check className='size-3.5' />
                      ) : (
                        <StepIcon className='size-3.5' />
                      )}
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
                        'mx-2 h-px flex-1 transition-colors duration-300',
                        step > s.id ? 'bg-foreground' : 'bg-border'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator className='mt-4' />

        {/* Step content */}
        <div className='flex-1 overflow-y-auto px-6 py-6 min-h-[300px]'>
          {/* Step 1: Details */}
          {step === 1 && (
            <div className='space-y-5 animate-in fade-in slide-in-from-right-2 duration-200'>
              <div >
                <div className='flex items-center gap-2'>
                 
                  <h3 className='text-sm font-semibold'>Survey Details</h3>
                </div>
                <p className='text-muted-foreground text-xs leading-relaxed'>
                  Give your survey a clear, descriptive name so your team can easily identify it.
                </p>
              </div>

              <div className='space-y-4 '>
                <Field>
                  <FieldLabel className='text-xs font-medium'>
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
                    className='h-10'
                  />
                  <FieldDescription>{titleLength}/200 characters</FieldDescription>
                  {errors.title && <FieldError>{errors.title.message}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel className='text-xs font-medium'>Description</FieldLabel>
                  <Textarea
                    placeholder='Briefly describe what this survey is about and who it is for...'
                    rows={3}
                    className='resize-none'
                    {...register('description')}
                  />
                  <FieldDescription>
                    {(description?.length ?? 0)}/500 characters. Optional but helps your team
                    understand the purpose.
                  </FieldDescription>
                </Field>
              </div>
            </div>
          )}

          {/* Step 2: Research Goal */}
          {step === 2 && (
            <div className='space-y-5 animate-in fade-in slide-in-from-right-2 duration-200'>
              <div >
                <div className='flex items-center gap-2'>
                  <div className='flex size-7 items-center justify-center rounded-lg bg-brand-soft'>
                    <Icons.sparkles className='size-4 text-foreground' />
                  </div>
                  <h3 className='text-sm font-semibold'>Research Goal</h3>
                </div>
                <p className='text-muted-foreground  text-xs leading-relaxed'>
                  Describe what you want to learn. The AI uses this to generate objectives,
                  questions, and sections.
                </p>
              </div>

              <div className='space-y-4 '>
                <Field>
                  <FieldLabel className='text-xs font-medium'>
                    Research Goal <span className='text-destructive'>*</span>
                  </FieldLabel>
                  <Textarea
                    placeholder='e.g., Assess the health status and healthcare access of residents in DICDO target communities to inform program design and resource allocation.'
                    rows={5}
                    className='resize-none'
                    aria-invalid={!!errors.researchGoal}
                    {...register('researchGoal')}
                  />
                  <FieldDescription>
                    {goalLength}/2,000 characters. Be specific for better AI output.
                  </FieldDescription>
                  {errors.researchGoal && <FieldError>{errors.researchGoal.message}</FieldError>}
                </Field>

                {/* AI benefits card */}
                <div className='rounded-xl border border-border bg-brand-soft/50 p-4'>
                  <div className='flex items-start gap-3'>
                    <div className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand-soft'>
                      <Icons.sparkles className='size-3.5 text-foreground' />
                    </div>
                    <div >
                      <p className='text-xs font-semibold'>AI will generate</p>
                      <ul className='text-muted-foreground space-y-1 text-xs'>
                        <li className='flex items-start gap-1.5'>
                          <span className='mt-0.5 size-1.5 shrink-0 rounded-full bg-brand' />
                          Research objectives aligned to your goal
                        </li>
                        <li className='flex items-start gap-1.5'>
                          <span className='mt-0.5 size-1.5 shrink-0 rounded-full bg-brand' />
                          Target respondent types
                        </li>
                        <li className='flex items-start gap-1.5'>
                          <span className='mt-0.5 size-1.5 shrink-0 rounded-full bg-brand' />
                          Proposed survey sections with rationale
                        </li>
                        <li className='flex items-start gap-1.5'>
                          <span className='mt-0.5 size-1.5 shrink-0 rounded-full bg-brand' />
                          Draft questions for each section
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className='space-y-5 animate-in fade-in slide-in-from-right-2 duration-200'>
              <div >
                <div className='flex items-center gap-2'>
                  <div className='flex size-7 items-center justify-center rounded-lg bg-brand-soft'>
                    <Icons.eyeOff className='size-4 text-foreground' />
                  </div>
                  <h3 className='text-sm font-semibold'>Preview & Generate</h3>
                </div>
                <p className='text-muted-foreground  text-xs leading-relaxed'>
                  Review your survey setup before AI generates the plan.
                </p>
              </div>

              <div className='space-y-3 '>
                {/* Survey card */}
                <div className='rounded-xl border border-border bg-card p-4 shadow-sm'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0 flex-1 space-y-1'>
                      <p className='text-sm font-semibold leading-snug'>
                        {title || 'Untitled Survey'}
                      </p>
                      {description ? (
                        <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>
                          {description}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant='secondary'
                      className='shrink-0 rounded-full text-[10px]'
                    >
                      Draft
                    </Badge>
                  </div>
                </div>

                {/* Research goal */}
                {researchGoal && (
                  <div className='space-y-2'>
                    <p className='text-muted-foreground text-xs font-medium uppercase tracking-wider'>
                      Research Goal
                    </p>
                    <div className='rounded-md bg-muted/60 border p-3 text-xs leading-relaxed text-foreground/80'>
                      {researchGoal.length > 300
                        ? `${researchGoal.slice(0, 300)}...`
                        : researchGoal}
                    </div>
                  </div>
                )}

                {!researchGoal && (
                  <div className='rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-4 text-center'>
                    <p className='text-destructive text-xs font-medium'>
                      Research goal is required. Go back to add one.
                    </p>
                  </div>
                )}

                {/* What happens next */}
                <div className='rounded-xl border border-border bg-brand-soft/50 p-4'>
                  <div className='flex items-start gap-3'>
                    <div className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand-soft'>
                      <Icons.sparkles className='size-3.5 text-foreground' />
                    </div>
                    <div className='space-y-2'>
                      <p className='text-xs font-semibold'>What happens next</p>
                      <ol className='text-muted-foreground space-y-1.5 text-xs'>
                        <li className='flex items-start gap-2'>
                          <span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background'>
                            1
                          </span>
                          Survey is created with your details
                        </li>
                        <li className='flex items-start gap-2'>
                          <span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background'>
                            2
                          </span>
                          AI generates sections, questions, and objectives
                        </li>
                        <li className='flex items-start gap-2'>
                          <span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background'>
                            3
                          </span>
                          You review and edit in the builder
                        </li>
                        <li className='flex items-start gap-2'>
                          <span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background'>
                            4
                          </span>
                          Publish when ready to collect responses
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className='px-6 py-4 flex items-center justify-between'>
          <div>
            {step > 1 && (
              <Button type='button' variant='ghost' onClick={handleBack}>
                <Icons.chevronLeft className='mr-1 h-4 w-4' />
                Back
              </Button>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Button type='button' variant='ghost' onClick={handleClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                type='button'
                className='h-9 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-primary font-semibold text-primary-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] hover:brightness-105'
                onClick={handleNext}
              >
                Continue
                <Icons.chevronRight className='ml-1 h-4 w-4' />
              </Button>
            ) : (
              <Button
                type='button'
                className='h-9 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-primary font-semibold text-primary-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] hover:brightness-105'
                disabled={isGenerating || !researchGoal || researchGoal.length < 10}
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
