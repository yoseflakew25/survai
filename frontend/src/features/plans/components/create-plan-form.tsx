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
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/toast';
import { createPlanWithAI } from '../api/service';
import { createPlanSchema, type CreatePlanValues } from '../schemas/plan.schema';
import { PlanGenerationProgress } from './plan-generation-progress';

interface CreatePlanFormProps {
  children: React.ReactNode;
}

export function CreatePlanForm({ children }: CreatePlanFormProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors }
  } = useForm<CreatePlanValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      researchGoal: ''
    }
  });

  const goalLength = watch('researchGoal')?.length ?? 0;

  async function onSubmit(values: CreatePlanValues) {
    setIsGenerating(true);

    try {
      const plan = await createPlanWithAI({ researchGoal: values.researchGoal });

      toast.success('Plan generated', {
        description: 'Your survey plan has been created with AI-generated content.'
      });

      reset();
      setOpen(false);
      router.push(`/dashboard/plans/${plan.id}`);
    } catch {
      toast.error('Failed to create plan', {
        description: 'Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isGenerating && !nextOpen) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
      setIsGenerating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={<button type='button' />}>{children}</SheetTrigger>
      <SheetContent side='right' className='sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>
            {isGenerating ? 'Generating Survey plan' : 'New Survey Plan'}
          </SheetTitle>
          <SheetDescription>
            {isGenerating
              ? 'SurvAI is carefully drafting your research plan. This usually takes 10–20 seconds.'
              : 'Describe your research goal and the AI will generate a structured plan with objectives, questions, and proposed sections.'}
          </SheetDescription>
        </SheetHeader>

        {isGenerating ? (
          <div className='flex flex-1 flex-col px-4 pb-4'>
            <PlanGenerationProgress
              active={isGenerating}
              goalPreview={getValues('researchGoal')}
            />
          </div>
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
