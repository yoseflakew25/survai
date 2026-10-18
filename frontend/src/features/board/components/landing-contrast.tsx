'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const SIDES = [
  {
    id: 'chatbot',
    label: 'Generic AI chat',
    verdict: 'Risky for evidence',
    tone: 'muted' as const,
    points: [
      'Can invent percentages that never existed',
      'No instrument, version, or response store',
      'Hard to audit what changed before a report'
    ]
  },
  {
    id: 'survai',
    label: 'Survai',
    verdict: 'Built for M&E',
    tone: 'brand' as const,
    points: [
      'AI drafts language — never invents figures',
      'Plan → Build → Review → Collect → Analyze → Report',
      'Every chart and count comes from stored answers'
    ]
  }
] as const;

export function LandingContrast() {
  const [focus, setFocus] = useState<'chatbot' | 'survai'>('survai');

  return (
    <section
      id='contrast'
      className='landing-section relative scroll-mt-24 pt-16 sm:pt-24'
    >
      <div
        className='dot-grid absolute inset-x-0 top-8 -z-10 h-56 opacity-70'
        aria-hidden='true'
      />

      <div className='text-center'>
        <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[2.1rem]'>
          Not another chatbot that <span className='hl'>guesses</span>
        </h2>
        <p className='mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground'>
          Same research question. Two systems. Hover or tap a side — Survai is
          built so figures stay defensible.
        </p>
      </div>

      <div className='mx-auto mt-6 flex w-fit items-center gap-0.5 rounded-full border border-border/60 bg-secondary p-[3px] sm:hidden'>
        {SIDES.map((side) => (
          <button
            key={side.id}
            type='button'
            onClick={() => setFocus(side.id)}
            className={cn(
              'h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors',
              focus === side.id
                ? side.tone === 'brand'
                  ? 'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-brand-foreground'
                  : 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            {side.label}
          </button>
        ))}
      </div>

      <div className='mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4'>
        {SIDES.map((side) => {
          const isFocus = focus === side.id;
          const isBrand = side.tone === 'brand';
          return (
            <button
              key={side.id}
              type='button'
              onClick={() => setFocus(side.id)}
              onMouseEnter={() => setFocus(side.id)}
              className={cn(
                'landing-panel-swap relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 sm:p-6',
                isBrand
                  ? 'border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)]'
                  : 'border-border bg-card shadow-sm',
                !isFocus && 'opacity-55 sm:opacity-70',
                isFocus && 'opacity-100 ring-0 sm:scale-[1.01]'
              )}
            >
              {isBrand ? (
                <div className='landing-grid-wash' aria-hidden='true' />
              ) : null}
              <div className='relative'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <h3
                      className={cn(
                        'font-display text-xl font-extrabold tracking-tight',
                        isBrand ? 'text-brand-foreground' : 'text-foreground',
                        !isBrand && 'line-through decoration-foreground/25'
                      )}
                    >
                      {side.label}
                    </h3>
                    <p
                      className={cn(
                        'mt-1 font-mono text-[11px] font-semibold tracking-wide uppercase',
                        isBrand
                          ? 'text-brand-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {side.verdict}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold',
                      isBrand
                        ? 'border-[color-mix(in_srgb,var(--foreground)_18%,transparent)] bg-card text-foreground'
                        : 'border-border bg-secondary text-muted-foreground'
                    )}
                    aria-hidden='true'
                  >
                    {isBrand ? '✓' : '—'}
                  </span>
                </div>
                <ul className='mt-5 space-y-3'>
                  {side.points.map((point) => (
                    <li
                      key={point}
                      className={cn(
                        'flex gap-3 rounded-xl px-3 py-2.5 text-sm leading-relaxed',
                        isBrand
                          ? 'border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-card/90 font-medium text-foreground shadow-sm'
                          : 'bg-muted/50 text-muted-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 size-1.5 shrink-0 rounded-full',
                          isBrand ? 'bg-brand-strong' : 'bg-foreground/30'
                        )}
                        aria-hidden='true'
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
