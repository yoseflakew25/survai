'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { IconChevronRight } from '@/features/board/components/launchpot-mark';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Digital access among community health workers',
  'Barriers to submitting weekly reports',
  'Training needs after a new MIS rollout'
] as const;

const STAGES = [
  'Plan',
  'Build',
  'Review',
  'Collect',
  'Analyze',
  'Report'
] as const;

function IconSpark({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      className={className}
      aria-hidden='true'
    >
      <path
        d='M12 3V6M12 18V21M3 12H6M18 12H21M5.64 5.64L7.76 7.76M16.24 16.24L18.36 18.36M5.64 18.36L7.76 16.24M16.24 7.76L18.36 5.64'
        stroke='currentColor'
        strokeLinecap='round'
        strokeWidth='1.5'
      />
      <circle cx='12' cy='12' r='3.25' stroke='currentColor' strokeWidth='1.5' />
    </svg>
  );
}

export function BoardHero() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [focused, setFocused] = useState(false);

  function goPlan(topic?: string) {
    const q = (topic ?? prompt).trim();
    const href = q
      ? `/dashboard/overview?topic=${encodeURIComponent(q)}`
      : '/dashboard/overview';
    router.push(href);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    goPlan();
  }

  return (
    <section className='relative pt-4 pb-12 text-center sm:pt-8 sm:pb-16'>
      <div
        className='dot-grid absolute inset-x-[-1rem] -top-6 -z-10 h-[28rem] sm:inset-x-[-2rem]'
        aria-hidden='true'
      />

      <div className='inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-soft/80 px-3 py-1 font-mono text-[11px] text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'>
        <span className='live-dot' aria-hidden='true' />
        <span className='font-semibold'>Plan → Report</span>
        <span className='text-muted-foreground'>· never invents stats</span>
      </div>

      <h1 className='font-display mx-auto mt-6 max-w-[18ch] text-[2.65rem] leading-[1.02] font-extrabold tracking-[-0.04em] text-foreground sm:mt-7 sm:max-w-none sm:text-[3.75rem]'>
        Surveys with numbers
        <br className='hidden sm:block' /> you can{' '}
        <span className='hl'>trust</span>.
      </h1>

      <p className='mx-auto mt-4 max-w-[34rem] text-[15px] leading-relaxed text-muted-foreground sm:text-base'>
        The survey lifecycle for teams who report to donors and boards — AI
        drafts the language, deterministic code owns every figure.
      </p>

      <div
        className={cn(
          'landing-shell-brand relative mx-auto mt-9 max-w-xl overflow-hidden rounded-[1.35rem] p-[3px] transition-shadow duration-300',
          focused &&
            'shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_35%,transparent)]'
        )}
      >
        <div className='landing-grid-wash opacity-50' aria-hidden='true' />
        <div className='relative rounded-[1.2rem] bg-card p-2 sm:p-2.5'>
          <form
            onSubmit={onSubmit}
            className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5'
          >
            <div className='flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 sm:px-1'>
              <span className='flex size-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground'>
                <IconSpark className='size-4' />
              </span>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder='What do you want to learn from respondents?'
                aria-label='Survey topic or research question'
                className='h-11 min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none'
              />
            </div>
            <button
              type='submit'
              className='btn-back h-11 w-full shrink-0 px-5 text-sm sm:w-auto'
            >
              Plan it <IconChevronRight className='h-4 w-4' />
            </button>
          </form>

          <div className='mt-2 flex flex-wrap gap-1.5 border-t border-border/70 px-1 pt-2.5'>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type='button'
                onClick={() => {
                  setPrompt(s);
                  goPlan(s);
                }}
                className='rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-left text-[11px] leading-snug text-muted-foreground transition-colors hover:border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] hover:bg-brand-soft hover:text-foreground'
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        aria-label='Survey lifecycle stages'
        className='mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-1.5'
      >
        {STAGES.map((stage, i) => (
          <span key={stage} className='inline-flex items-center gap-1.5'>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide uppercase',
                i === 0
                  ? 'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-brand-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_12%,transparent)]'
                  : 'border border-border bg-card text-muted-foreground'
              )}
            >
              {stage}
            </span>
            {i < STAGES.length - 1 ? (
              <span
                className='hidden h-px w-3 bg-border sm:block'
                aria-hidden='true'
              />
            ) : null}
          </span>
        ))}
      </div>

      <p className='mt-5 font-mono text-[11px] text-muted-foreground'>
        0% numerical hallucination · grounded analytics only
      </p>

      <Link
        href='/dashboard/overview'
        className='mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
      >
        Already working on a survey? Open the dashboard
        <IconChevronRight className='h-3.5 w-3.5' />
      </Link>
    </section>
  );
}
