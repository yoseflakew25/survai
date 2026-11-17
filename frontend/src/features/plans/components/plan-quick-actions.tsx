'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { cn } from '@/lib/utils';

type PlanQuickActionsProps = {
  canUndo: boolean;
  canRedo: boolean;
  pastCount: number;
  futureCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onRegenerate: () => void;
  isSaving: boolean;
  isGenerating: boolean;
  hasUnsavedChanges: boolean;
  canRegenerate: boolean;
  /** Plan is immutable after questions were generated. */
  locked?: boolean;
};

function ActionTile({
  label,
  hint,
  shortcut,
  icon,
  onClick,
  disabled,
  active
}: {
  label: string;
  hint: string;
  shortcut: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} — ${hint}`}
      className={cn(
        'group relative flex flex-col items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-all',
        'focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        active && !disabled
          ? 'border-border bg-card shadow-sm hover:border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] hover:bg-brand-soft/40 active:scale-[0.98]'
          : 'border-transparent bg-transparent',
        disabled && 'cursor-not-allowed opacity-45'
      )}
    >
      <div className='flex w-full items-center justify-between gap-2'>
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-lg transition-colors',
            active && !disabled
              ? 'bg-muted text-foreground group-hover:bg-brand-soft'
              : 'bg-muted/60 text-muted-foreground'
          )}
        >
          {icon}
        </span>
        <Kbd className='opacity-70'>{shortcut}</Kbd>
      </div>
      <div className='min-w-0'>
        <p
          className={cn(
            'text-sm font-semibold tracking-tight',
            active ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {label}
        </p>
        <p className='text-muted-foreground  text-[11px] leading-snug'>
          {hint}
        </p>
      </div>
    </button>
  );
}

export function PlanQuickActions({
  canUndo,
  canRedo,
  pastCount,
  futureCount,
  onUndo,
  onRedo,
  onSave,
  onRegenerate,
  isSaving,
  isGenerating,
  hasUnsavedChanges,
  canRegenerate,
  locked = false
}: PlanQuickActionsProps) {
  const t = useTranslations('plan');
  const tCommon = useTranslations('common');
  const [confirmRegen, setConfirmRegen] = useState(false);

  if (locked) {
    return (
      <SurvaiPanel>
        <SurvaiPanelHeader
          icon={<Icons.check className='size-3.5' />}
          title={t('editingLocked')}
          subtitle={t('questionsAlreadyGenerated')}
          badge={
            <span className='inline-flex items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground'>
              {t('readOnly')}
            </span>
          }
        />
        <SurvaiPanelBody className='space-y-3 p-4'>
          <p className='text-sm leading-relaxed text-foreground'>
            {t('lockedImmutable')}
          </p>
          <ul className='text-muted-foreground space-y-1.5 text-xs leading-relaxed'>
            <li className='flex gap-2'>
              <Icons.circleCheck className=' size-3.5 shrink-0 text-primary' />
              {t('lockedSourceOfTruth')}
            </li>
            <li className='flex gap-2'>
              <Icons.review className=' size-3.5 shrink-0 text-primary' />
              {t('lockedChangeOnReview')}
            </li>
          </ul>
        </SurvaiPanelBody>
      </SurvaiPanel>
    );
  }

  return (
    <>
      <SurvaiPanel>
        <SurvaiPanelHeader
          icon={<Icons.edit className='size-3.5' />}
          title={t('quickActions')}
          subtitle={t('quickActionsSubtitle')}
          badge={
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                hasUnsavedChanges
                  ? 'bg-brand-soft text-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  hasUnsavedChanges
                    ? 'bg-brand-strong animate-pulse'
                    : 'bg-muted-foreground/40'
                )}
              />
              {hasUnsavedChanges ? t('unsaved') : t('savedBadge')}
            </span>
          }
        />

        <SurvaiPanelBody className='space-y-3 p-3'>
          <div className='bg-muted/35 grid grid-cols-2 gap-1 rounded-2xl p-1'>
            <ActionTile
              label={t('undo')}
              hint={
                canUndo
                  ? t('stepsBack', { count: pastCount })
                  : t('nothingToUndo')
              }
              shortcut='⌘Z'
              icon={<Icons.chevronsLeft className='size-3.5' />}
              onClick={onUndo}
              disabled={!canUndo}
              active={canUndo}
            />
            <ActionTile
              label={t('redo')}
              hint={
                canRedo
                  ? t('stepsAhead', { count: futureCount })
                  : t('nothingToRedo')
              }
              shortcut='⌘⇧Z'
              icon={<Icons.chevronsRight className='size-3.5' />}
              onClick={onRedo}
              disabled={!canRedo}
              active={canRedo}
            />
          </div>

          <button
            type='button'
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={cn(
              'group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all',
              'focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              hasUnsavedChanges
                ? 'border-border bg-card shadow-sm hover:border-[color-mix(in_srgb,var(--brand)_50%,var(--border))] hover:bg-brand-soft/30 active:scale-[0.99]'
                : 'border-transparent bg-muted/30 opacity-70',
              (isSaving || !hasUnsavedChanges) && 'cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                hasUnsavedChanges
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isSaving ? (
                <Icons.spinner className='size-4 animate-spin' />
              ) : (
                <Icons.check className='size-4' />
              )}
            </span>
            <span className='min-w-0 flex-1'>
              <span className='text-foreground block text-sm font-semibold tracking-tight'>
                {isSaving
                  ? tCommon('saving')
                  : hasUnsavedChanges
                    ? t('saveProgress')
                    : t('allChangesSaved')}
              </span>
              <span className='text-muted-foreground  block text-[11px] leading-snug'>
                {hasUnsavedChanges
                  ? t('saveProgressHint')
                  : t('upToDateHint')}
              </span>
            </span>
            <Kbd className='shrink-0 opacity-70'>⌘S</Kbd>
          </button>

          <button
            type='button'
            onClick={() => setConfirmRegen(true)}
            disabled={isGenerating || !canRegenerate}
            className={cn(
              'group relative w-full overflow-hidden rounded-xl border text-left transition-all',
              'focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              canRegenerate && !isGenerating
                ? 'border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft/50 shadow-sm hover:bg-brand-soft active:scale-[0.99]'
                : 'border-border bg-muted/25 cursor-not-allowed opacity-55'
            )}
          >
            <div className='flex items-start gap-3 px-3 py-3'>
              <span className='bg-brand text-brand-foreground flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm'>
                {isGenerating ? (
                  <Icons.spinner className='size-4 animate-spin' />
                ) : (
                  <Icons.sparkles className='size-4' />
                )}
              </span>
              <span className='min-w-0 flex-1 pt-0.5'>
                <span className='text-foreground block text-sm font-semibold tracking-tight'>
                  {isGenerating ? t('regenerating') : t('regenerate')}
                </span>
                <span className='text-muted-foreground  block text-[11px] leading-snug'>
                  {canRegenerate
                    ? t('regenerateHint')
                    : t('regenerateNeedsGoal')}
                </span>
              </span>
              <Icons.arrowRight className='text-foreground/50  size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-disabled:translate-x-0' />
            </div>
          </button>
        </SurvaiPanelBody>
      </SurvaiPanel>

      <Dialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <DialogContent className='sm:max-w-md gap-0 overflow-hidden p-0'>
          <DialogHeader className='border-b border-border bg-brand-soft px-5 py-4 text-foreground'>
            <DialogTitle>{t('regenerateConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-2'>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {t('regenerateConfirmBody')}
            </p>
          </div>
          <Separator />
          <div className='flex items-center justify-end gap-2 px-4 py-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setConfirmRegen(false)}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type='button'
              onClick={() => {
                setConfirmRegen(false);
                onRegenerate();
              }}
              disabled={isGenerating || !canRegenerate}
            >
              <Icons.sparkles className='size-4' />
              {t('replaceAndRegenerate')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
