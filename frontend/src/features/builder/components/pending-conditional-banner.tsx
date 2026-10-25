'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { ConditionalLogic } from '../api/types';

interface PendingConditionalBannerProps {
  logic: ConditionalLogic;
  onConfirm: () => void;
  onDismiss: () => void;
  busy?: boolean;
}

/** BLD-04 — AI-suggested skip logic stays pending until the user confirms. */
export function PendingConditionalBanner({
  logic,
  onConfirm,
  onDismiss,
  busy = false
}: PendingConditionalBannerProps) {
  const summary = logic.rules
    .map((r) => `${r.questionId.slice(0, 8)}… ${r.op} ${String(r.value)}`)
    .join(` ${logic.operator} `);

  return (
    <div
      className='space-y-2 rounded-xl border border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-soft/60 p-3'
      role='status'
    >
      <div className='flex items-start gap-2'>
        <Icons.sparkles className='mt-0.5 size-3.5 shrink-0 text-foreground' />
        <div className='min-w-0 flex-1'>
          <p className='text-xs font-semibold tracking-tight'>
            Pending conditional logic
          </p>
          <p className='text-muted-foreground mt-0.5 text-[11px] leading-relaxed'>
            Suggested skip rule is not live yet. Confirm to write it to the
            question, or dismiss to discard.
          </p>
          <p className='mt-1 font-mono text-[10px] break-all text-foreground/80'>
            Show when {summary || '—'}
          </p>
        </div>
      </div>
      <div className='flex gap-2'>
        <Button
          size='sm'
          className='h-8 rounded-lg text-xs'
          disabled={busy}
          onClick={onConfirm}
        >
          <Icons.check className='mr-1 size-3' />
          Confirm
        </Button>
        <Button
          size='sm'
          variant='ghost'
          className='h-8 rounded-lg text-xs'
          disabled={busy}
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
