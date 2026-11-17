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
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContentLanguagePicker } from '@/components/content-language-picker';
import { toast } from '@/lib/toast';
import { isAppLocale } from '@/i18n/config';
import { createPlanWithAI } from '../api/service';
import type { ContentLanguage } from '../api/types';
import { createPlanSchema, type CreatePlanValues } from '../schemas/plan.schema';
import { PlanGenerationProgress } from './plan-generation-progress';

interface CreatePlanFormProps {
  children: React.ReactNode;
}

export function CreatePlanForm({ children }: CreatePlanFormProps) {
  const t = useTranslations('plan');
  const tCommon = useTranslations('common');
  const uiLocale = useLocale();
  const defaultContentLanguage: ContentLanguage = isAppLocale(uiLocale)
    ? uiLocale
    : 'en';
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentLanguage, setContentLanguage] =
    useState<ContentLanguage>(defaultContentLanguage);
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
      const plan = await createPlanWithAI({
        researchGoal: values.researchGoal,
        contentLanguage
      });

      toast.success(t('planGenerated'), {
        description: t('planCreatedDesc')
      });

      reset();
      setContentLanguage(defaultContentLanguage);
      setOpen(false);
      router.push(`/dashboard/plans/${plan.id}`);
    } catch {
      toast.error(t('createFailed'), {
        description: t('saveFailedDesc')
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
      setContentLanguage(defaultContentLanguage);
      setIsGenerating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={<button type='button' aria-label={t('createAria')} />}
      >
        {children}
      </SheetTrigger>
      <SheetContent
        side='right'
        className={
          isGenerating
            ? 'border-0 bg-transparent p-0 shadow-none sm:max-w-md'
            : 'sm:max-w-lg'
        }
      >
        {isGenerating ? (
          <div className='flex h-full items-center px-4 py-8'>
            <PlanGenerationProgress
              active={isGenerating}
              goalPreview={getValues('researchGoal')}
              className='w-full'
            />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{t('createTitle')}</SheetTitle>
              <SheetDescription>
                {t('createDesc')}
              </SheetDescription>
            </SheetHeader>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className='flex flex-1 flex-col gap-4 px-4 pb-4'
            >
              <Field>
                <FieldLabel htmlFor='researchGoal'>{t('goalFieldLabel')}</FieldLabel>
                <Textarea
                  id='researchGoal'
                  placeholder={t('createGoalPlaceholder')}
                  rows={6}
                  className='resize-none'
                  aria-invalid={!!errors.researchGoal}
                  {...register('researchGoal')}
                />
                <FieldDescription>
                  {t('goalLengthHint', { count: String(goalLength) })}
                </FieldDescription>
                {errors.researchGoal && (
                  <FieldError>{errors.researchGoal.message}</FieldError>
                )}
              </Field>

              <ContentLanguagePicker
                value={contentLanguage}
                onChange={setContentLanguage}
                disabled={isGenerating}
              />

              <div className='flex items-center gap-3 pt-2'>
                <Button type='submit'>
                  <Icons.sparkles className='mr-2 h-4 w-4' />
                  {t('generateSurveyPlan')}
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => setOpen(false)}
                >
                  {tCommon('cancel')}
                </Button>
              </div>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
