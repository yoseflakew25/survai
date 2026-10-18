'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    id: 'plan',
    label: 'Plan',
    title: 'Start with the decision',
    body: 'Describe what you need to learn. Survai turns that into clear objectives, audiences, and sections — so you stop writing questions before you know why.',
    preview: {
      eyebrow: 'Your plan',
      lines: [
        'Goal: Understand barriers to program uptake',
        'Audience: Youth beneficiaries, ages 18–35',
        'Sections: Access · Experience · Next steps'
      ]
    }
  },
  {
    id: 'build',
    label: 'Build',
    title: 'Get a first draft in minutes',
    body: 'AI proposes questions you can keep, edit, or replace. Build manually anytime — you never lose control of the survey.',
    preview: {
      eyebrow: 'Draft question',
      lines: [
        'Q3 · Single choice · Required',
        'What made it hard to attend sessions?',
        '□ Distance  □ Timing  □ Cost  □ Other'
      ]
    }
  },
  {
    id: 'review',
    label: 'Review',
    title: 'Catch weak questions early',
    body: 'Spot leading wording, double-barreled asks, and surveys that run too long — before respondents ever see them.',
    preview: {
      eyebrow: 'Quality check',
      lines: [
        'Flag: Leading phrasing',
        '“Don’t you agree the training was useful?”',
        'Suggestion: Ask how useful — neutrally'
      ]
    }
  },
  {
    id: 'collect',
    label: 'Collect',
    title: 'Share a link. Get answers.',
    body: 'Publish once, share a link or QR, and collect on phone or laptop. Respondents need no account.',
    preview: {
      eyebrow: 'Live collection',
      lines: [
        'Status: Open · Round 1',
        'Share link · Print QR',
        '128 responses this week'
      ]
    }
  },
  {
    id: 'analyze',
    label: 'Analyze',
    title: 'See what the data actually says',
    body: 'Distributions, filters, and comparisons calculated from real responses — so you spend time interpreting, not wrestling spreadsheets.',
    preview: {
      eyebrow: 'Key result',
      lines: [
        '128 complete responses',
        'Distance cited by 41% as a barrier',
        'Ready to explore by gender · location'
      ]
    }
  },
  {
    id: 'report',
    label: 'Report',
    title: 'Turn findings into a story',
    body: 'Generate a structured report for donors, boards, or your team — then chat with it to pull the right takeaway for each audience.',
    preview: {
      eyebrow: 'Report draft',
      lines: [
        'Executive summary · Key findings',
        'Recommendations tied to results',
        'Tone: Donor · Internal · Leadership'
      ]
    }
  }
] as const;

export function LandingLifecycle() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <section
      id='lifecycle'
      className='landing-section scroll-mt-24 pt-16 sm:pt-20'
    >
      <h2 className='font-display text-center text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-3xl'>
        From “we need to learn” to “here’s what to do”
      </h2>
      <p className='mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-muted-foreground'>
        One continuous journey — no more jumping between docs, form tools,
        spreadsheets, and Word.
      </p>

      <div
        role='tablist'
        aria-label='Survey lifecycle stages'
        className='mt-7 flex gap-1 overflow-x-auto rounded-full border border-border/60 bg-secondary p-[3px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      >
        {STEPS.map((s, i) => {
          const isActive = i === active;
          return (
            <button
              key={s.id}
              type='button'
              role='tab'
              aria-selected={isActive}
              id={`lifecycle-tab-${s.id}`}
              aria-controls='lifecycle-panel'
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div
        key={step.id}
        id='lifecycle-panel'
        role='tabpanel'
        aria-labelledby={`lifecycle-tab-${step.id}`}
        className='landing-panel-swap mt-5 grid gap-4 sm:grid-cols-[1fr_1.05fr] sm:items-stretch'
      >
        <div className='flex flex-col justify-center rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6'>
          <p className='font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase'>
            Stage {active + 1} of {STEPS.length}
          </p>
          <h3 className='font-display mt-1.5 text-xl font-extrabold tracking-tight text-foreground'>
            {step.title}
          </h3>
          <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
            {step.body}
          </p>
        </div>

        <div className='relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)]'>
          <div
            className='pointer-events-none absolute inset-0 opacity-40'
            style={{
              backgroundImage:
                'linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              maskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)'
            }}
            aria-hidden='true'
          />
          <div className='relative space-y-3 p-5 sm:p-6'>
            <p className='font-mono text-[11px] font-semibold tracking-wide text-brand-foreground/70 uppercase'>
              {step.preview.eyebrow}
            </p>
            <ul className='space-y-2'>
              {step.preview.lines.map((line) => (
                <li
                  key={line}
                  className='rounded-xl border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-card/90 px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm'
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
