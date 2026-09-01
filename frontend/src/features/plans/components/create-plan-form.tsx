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
import { LoadingButton } from '@/components/ui/loading-button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createPlan } from '../api/service';
import { createPlanSchema, type CreatePlanValues } from '../schemas/plan.schema';

interface CreatePlanFormProps {
  children: React.ReactNode;
}

export function CreatePlanForm({ children }: CreatePlanFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<CreatePlanValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      researchGoal: ''
    }
  });

  const goalLength = watch('researchGoal')?.length ?? 0;

  async function onSubmit(values: CreatePlanValues) {
    try {
      const plan = await createPlan({ researchGoal: values.researchGoal });
      toast.success('Plan created', {
        description: 'Your new survey plan has been created.'
      });
      reset();
      setOpen(false);
      router.push(`/dashboard/plans/${plan.id}`);
    } catch {
      toast.error('Failed to create plan', {
        description: 'Please try again.'
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<div />}>{children}</SheetTrigger>
      <SheetContent side='right' className='sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>New Survey Plan</SheetTitle>
          <SheetDescription>
            Describe your research goal and the AI will generate a structured plan
            with objectives, questions, and proposed sections.
          </SheetDescription>
        </SheetHeader>

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
            <LoadingButton
              type='submit'
              loading={isSubmitting}
              loadingLabel='Creating…'
            >
              <Icons.sparkles className='mr-2 h-4 w-4' />
              Create Plan
            </LoadingButton>
            <Button
              type='button'
              variant='ghost'
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
