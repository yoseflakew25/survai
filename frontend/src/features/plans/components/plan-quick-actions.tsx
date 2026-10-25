'use client';

import { useState } from 'react';

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
        <p className='text-muted-foreground mt-0.5 text-[11px] leading-snug'>
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
  const [confirmRegen, setConfirmRegen] = useState(false);

  if (locked) {
    return (
      <SurvaiPanel>
        <SurvaiPanelHeader
          icon={<Icons.check className='size-3.5' />}
          title='Plan locked'
          subtitle='Questions already generated'
          badge={
            <span className='bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold'>
              Read-only
            </span>
          }
        />
        <SurvaiPanelBody className='p-3'>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            This research plan can no longer be edited or regenerated. Change
            survey questions on the Review tab instead.
          </p>
        </SurvaiPanelBody>
      </SurvaiPanel>
    );
  }

  return (
    <>
      <SurvaiPanel>
        <SurvaiPanelHeader
          icon={<Icons.edit className='size-3.5' />}
          title='Quick actions'
          subtitle='Edit history, save, and AI'
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
              {hasUnsavedChanges ? 'Unsaved' : 'Saved'}
            </span>
          }
        />

        <SurvaiPanelBody className='space-y-3 p-3'>
          <div className='bg-muted/35 grid grid-cols-2 gap-1 rounded-2xl p-1'>
            <ActionTile
              label='Undo'
              hint={
                canUndo
                  ? `${pastCount} step${pastCount === 1 ? '' : 's'} back`
                  : 'Nothing to undo'
              }
              shortcut='⌘Z'
              icon={<Icons.chevronsLeft className='size-3.5' />}
              onClick={onUndo}
              disabled={!canUndo}
              active={canUndo}
            />
            <ActionTile
              label='Redo'
              hint={
                canRedo
                  ? `${futureCount} step${futureCount === 1 ? '' : 's'} ahead`
                  : 'Nothing to redo'
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
                  ? 'Saving…'
                  : hasUnsavedChanges
                    ? 'Save progress'
                    : 'All changes saved'}
              </span>
              <span className='text-muted-foreground mt-0.5 block text-[11px] leading-snug'>
                {hasUnsavedChanges
                  ? 'Keep your latest edits on the plan'
                  : "You're up to date — keep editing"}
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
              <span className='bg-brand text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm'>
                {isGenerating ? (
                  <Icons.spinner className='size-4 animate-spin' />
                ) : (
                  <Icons.sparkles className='size-4' />
                )}
              </span>
              <span className='min-w-0 flex-1 pt-0.5'>
                <span className='text-foreground block text-sm font-semibold tracking-tight'>
                  {isGenerating ? 'Regenerating…' : 'Regenerate with AI'}
                </span>
                <span className='text-muted-foreground mt-0.5 block text-[11px] leading-snug'>
                  {canRegenerate
                    ? 'Rewrite objectives, questions, audiences & sections from your goal'
                    : 'Add a research goal to enable AI regenerate'}
                </span>
              </span>
              <Icons.arrowRight className='text-foreground/50 mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-disabled:translate-x-0' />
            </div>
          </button>
        </SurvaiPanelBody>
      </SurvaiPanel>

      <Dialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <DialogContent className='sm:max-w-md gap-0 overflow-hidden p-0'>
          <DialogHeader className='bg-primary'>
            <DialogTitle>Regenerate this plan?</DialogTitle>
          </DialogHeader>
          <div className='px-4 pt-4 pb-2'>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              This permanently replaces objectives, research questions, target
              respondents, and sections with a new AI draft from your current
              research goal. Previous content (including undo history) will not
              be kept.
            </p>
          </div>
          <Separator />
          <div className='flex items-center justify-end gap-2 px-4 py-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setConfirmRegen(false)}
            >
              Cancel
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
              Replace &amp; regenerate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
