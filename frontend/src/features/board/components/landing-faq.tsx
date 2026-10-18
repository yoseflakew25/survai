'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: 'Does Survai generate statistics with AI?',
    a: 'No. AI helps with plans, question wording, review notes, and report narrative. Aggregations and charts run against stored responses in application code.'
  },
  {
    q: 'Can respondents answer without signing up?',
    a: 'Yes. After you publish, you share a public collection link or QR. Respondents open it and answer — no Survai account required.'
  },
  {
    q: 'What happens when I publish a new version?',
    a: 'Publishing creates a versioned snapshot of the instrument. New respondents get that version. You can close collection when a round is finished.'
  },
  {
    q: 'Who is Survai for?',
    a: 'Monitoring & evaluation teams, CSOs, and researchers who need an end-to-end survey workflow where invented numbers are unacceptable.'
  },
  {
    q: 'Is this a finished product?',
    a: 'Survai is in active development with a pilot focus. Core Plan → Collect flows are live; analytics and reporting continue to deepen.'
  }
] as const;

export function LandingFaq() {
  const [open, setOpen] = useState(0);

  return (
    <section id='faq' className='landing-section scroll-mt-24 pt-16 sm:pt-24'>
      <div className='landing-shell overflow-hidden'>
        <div className='relative border-b border-border px-5 py-8 sm:px-8 sm:py-10'>
          <div
            className='dot-grid absolute inset-0 opacity-40'
            aria-hidden='true'
          />
          <div className='relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
            <div className='max-w-lg'>
              <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[2.1rem]'>
                Questions, <span className='hl'>answered</span>
              </h2>
              <p className='mt-2.5 text-sm leading-relaxed text-muted-foreground'>
                Straight answers about AI, collection, and who Survai is for.
              </p>
            </div>
            <div className='inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft px-3 py-1.5 font-mono text-[11px] font-semibold text-foreground'>
              <span className='live-dot' aria-hidden='true' />
              {FAQS.length} common questions
            </div>
          </div>
        </div>

        <div>
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className={cn(
                  'border-b border-border last:border-b-0',
                  isOpen && 'bg-brand-soft/35'
                )}
              >
                <button
                  type='button'
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className='flex w-full items-start justify-between gap-4 px-5 py-4 text-left sm:px-8 sm:py-5'
                >
                  <span className='flex min-w-0 items-start gap-3'>
                    <span
                      className={cn(
                        'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold tabular-nums transition-colors',
                        isOpen
                          ? 'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-brand-foreground'
                          : 'border border-border bg-secondary text-muted-foreground'
                      )}
                      aria-hidden='true'
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className='pt-0.5 text-sm font-semibold tracking-tight text-foreground sm:text-[15px]'>
                      {item.q}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-sm transition-all',
                      isOpen
                        ? 'rotate-45 border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-brand-foreground'
                        : 'border-border bg-card text-muted-foreground'
                    )}
                    aria-hidden='true'
                  >
                    +
                  </span>
                </button>
                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <div className='overflow-hidden'>
                    <p className='border-t border-border/60 px-5 pb-5 pl-[3.75rem] text-sm leading-relaxed text-muted-foreground sm:px-8 sm:pb-6 sm:pl-[4.75rem]'>
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
