'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createPlanWithAI } from '../api/service';
import { createPlanSchema, type CreatePlanValues } from '../schemas/plan.schema';
import { cn } from '@/lib/utils';

interface CreatePlanFormProps {
  children: React.ReactNode;
}

const generationSteps = [
  { key: 'Creating plan...', icon: 'add' as const },
  { key: 'Analyzing research goal...', icon: 'sparkles' as const },
  { key: 'Generating objectives...', icon: 'check' as const },
  { key: 'Generating research questions...', icon: 'chat' as const },
  { key: 'Identifying target respondents...', icon: 'teams' as const },
  { key: 'Designing survey sections...', icon: 'forms' as const },
  { key: 'Finalizing plan...', icon: 'sparkles' as const },
  { key: 'Plan generated!', icon: 'check' as const }
];

export function CreatePlanForm({ children }: CreatePlanFormProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreatePlanValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      researchGoal: ''
    }
  });

  const goalLength = watch('researchGoal')?.length ?? 0;

  const onProgress = useCallback((step: string, prog: number) => {
    setCurrentStep(step);
    setProgress(prog);
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  async function onSubmit(values: CreatePlanValues) {
    setIsGenerating(true);
    setCompletedSteps(new Set());

    try {
      const plan = await createPlanWithAI({ researchGoal: values.researchGoal }, onProgress);

      toast.success('Plan generated', {
        description: 'Your survey plan has been created with AI-generated content.'
      });

      reset();
      setOpen(false);

      // Small delay so user sees "Plan generated!" step
      await new Promise((r) => setTimeout(r, 500));

      router.push(`/dashboard/plans/${plan.id}`);
    } catch {
      toast.error('Failed to create plan', {
        description: 'Please try again.'
      });
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
      setProgress(0);
      setCompletedSteps(new Set());
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isGenerating && !nextOpen) return; // Prevent closing while generating
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      setIsGenerating(false);
      setCurrentStep('');
      setProgress(0);
      setCompletedSteps(new Set());
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={<button type='button' />}>{children}</SheetTrigger>
      <SheetContent side='right' className='sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>New Survey Plan</SheetTitle>
          <SheetDescription>
            Describe your research goal and the AI will generate a structured plan
            with objectives, questions, and proposed sections.
          </SheetDescription>
        </SheetHeader>

        {isGenerating ? (
          <GenerationProgress
            currentStep={currentStep}
            progress={progress}
            completedSteps={completedSteps}
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className='flex flex-1 flex-col gap-4 px-4 pb-4'>
            <Field>
              <FieldLabel htmlFor='researchGoal'>Research Goal *</FieldLabel>
              <Textarea
                id='researchGoal'
                placeholder='e.g., Assess the health status and healthcare access of residents in target communities to inform program design...'
                rows={6}
                className='resize-none'
                aria-invalid={!!errors.researchGoal}
                {...register('researchGoal')}
              />
              <FieldDescription>
                {goalLength}/2,000 characters. Be specific about what you want to learn, why it matters,
                and who will benefit.
              </FieldDescription>
              {errors.researchGoal && (
                <FieldError>{errors.researchGoal.message}</FieldError>
              )}
            </Field>

            <div className='flex items-center gap-3 pt-2'>
              <Button type='submit'>
                <Icons.sparkles className='mr-2 h-4 w-4' />
                Generate Survey Plan
              </Button>
              <Button
                type='button'
                variant='ghost'
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Generation Progress UI ──────────────────────────────────────

function GenerationProgress({
  currentStep,
  progress,
  completedSteps
}: {
  currentStep: string;
  progress: number;
  completedSteps: Set<string>;
}) {
  return (
    <div className='flex flex-1 flex-col px-4 pb-4'>
      {/* Progress bar */}
      <div className='mb-6'>
        <div className='mb-2 flex items-center justify-between'>
          <span className='text-sm font-medium'>Generating your plan...</span>
          <span className='text-muted-foreground text-sm'>{progress}%</span>
        </div>
        <div className='bg-muted h-2 overflow-hidden rounded-full'>
          <div
            className='bg-primary h-full rounded-full transition-all duration-500 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className='space-y-1'>
        {generationSteps.map((step) => {
          const Icon = Icons[step.icon];
          const isCompleted = completedSteps.has(step.key);
          const isCurrent = currentStep === step.key;
          const isPending = !isCompleted && !isCurrent;

          return (
            <div
              key={step.key}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isCurrent && 'bg-primary/10 text-primary',
                isCompleted && 'text-foreground',
                isPending && 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full',
                  isCurrent && 'bg-primary text-primary-foreground',
                  isCompleted && 'bg-primary/10 text-primary',
                  isPending && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Icons.check className='size-3.5' />
                ) : isCurrent ? (
                  <Icons.spinner className='size-3.5 animate-spin' />
                ) : (
                  <Icon className='size-3.5' />
                )}
              </div>
              <span className={cn('flex-1', isCurrent && 'font-medium')}>
                {step.key}
              </span>
              {isCompleted && (
                <span className='text-primary text-xs'>✓</span>
              )}
            </div>
          );
        })}
      </div>

      <p className='text-muted-foreground mt-6 text-center text-xs'>
        This may take a few seconds. The AI is analyzing your research goal
        and generating a comprehensive survey plan.
      </p>
    </div>
  );
}
