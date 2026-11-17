'use client';

import { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import type { Survey } from '../api/types';
import { generateSurveyDraft } from '../api/service';
import { SurveyGenerationProgress } from './survey-generation-progress';
import { useTranslations } from 'next-intl';

interface AIGenerationPanelProps {
  surveyId: string;
  planId: string | null;
  goalPreview?: string;
  /** Called with the persisted survey after a hard-replace generate. */
  onApplied: (survey: Survey) => void;
  /** When true, regenerate is disabled (published / closed / archived). */
  locked?: boolean;
}

export function AIGenerationPanel({
  surveyId,
  planId,
  goalPreview,
  onApplied,
  locked = false
}: AIGenerationPanelProps) {
  const t = useTranslations('builder');
  const tCommon = useTranslations('common');
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (locked) {
      toast.error(t('lockedToast'), {
        description: t('lockedRegenDesc')
      });
      return;
    }
    if (!planId) {
      toast.error(t('noLinkedPlan'), {
        description: t('noLinkedPlanDesc')
      });
      return;
    }

    setConfirmOpen(false);
    setIsGenerating(true);
    try {
      const survey = await generateSurveyDraft(surveyId);
      // Same survey id; sections/questions hard-replaced — no merge with prior draft.
      onApplied(survey);
      toast.success(t('surveyRegenerated'), {
        description: t('surveyRegeneratedDesc', {
          count: survey.sections.length
        })
      });
    } catch (err) {
      toast.error(t('generationFailed'), {
        description:
          err instanceof Error && err.message
            ? err.message
            : tCommon('pleaseTryAgain')
      });
    } finally {
      setIsGenerating(false);
    }
  }, [surveyId, planId, onApplied, locked, t, tCommon]);

  return (
    <>
      <div className='rounded-lg border bg-background p-4'>
        <div className='mb-3 flex items-center gap-2'>
          <div className='bg-primary/10 flex h-7 w-7 items-center justify-center rounded-md'>
            <Icons.sparkles className='text-primary h-4 w-4' />
          </div>
          <h3 className='text-sm font-semibold'>{t('aiAssistant')}</h3>
        </div>

        <p className='text-muted-foreground mb-3 text-xs leading-relaxed'>
          {locked ? t('lockedHint') : t('regenerateHint')}
        </p>

        <Button
          className='w-full'
          size='default'
          onClick={() => setConfirmOpen(true)}
          disabled={isGenerating || !planId || locked}
        >
          {isGenerating ? (
            <>
              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
              {t('regenerating')}
            </>
          ) : (
            <>
              <Icons.sparkles className='mr-2 h-4 w-4' />
              {t('regenerateWithAi')}
            </>
          )}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className='sm:max-w-md gap-0 overflow-hidden p-0'>
          <DialogHeader className='border-b border-border bg-brand-soft px-5 py-4 text-foreground'>
            <DialogTitle>{t('regenerateTitle')}</DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-2'>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {t('regenerateBody')}
            </p>
          </div>
          <Separator />
          <div className='flex items-center justify-end gap-2 px-4 py-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setConfirmOpen(false)}
              disabled={isGenerating}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type='button'
              onClick={() => void handleGenerate()}
              disabled={isGenerating || !planId}
            >
              <Icons.sparkles className='size-4' />
              {t('replaceRegenerate')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isGenerating}
        onOpenChange={(next) => {
          if (!next && isGenerating) return;
        }}
      >
        <DialogContent
          className='sm:max-w-md gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none ring-0'
          showCloseButton={false}
        >
          <DialogTitle className='sr-only'>
            {t('generatingQuestions')}
          </DialogTitle>
          <SurveyGenerationProgress
            active={isGenerating}
            goalPreview={goalPreview}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
