'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    id: 'plan',
    label: 'Plan',
    title: 'Shape the research brief',
    body: 'Turn a research question into sections, objectives, and sampling notes — before a single question is written.',
    preview: {
      eyebrow: 'Research plan',
      lines: [
        'Objective: Measure digital access barriers',
        'Audience: Community health workers',
        'Sections: 4 · Est. 12 minutes'
      ]
    }
  },
  {
    id: 'build',
    label: 'Build',
    title: 'Generate the instrument',
    body: 'AI drafts clear questions and logic. You edit wording, required flags, and branching — the structure stays yours.',
    preview: {
      eyebrow: 'Question draft',
      lines: [
        'Q3 · Single choice · Required',
        'Which devices do you use for work?',
        '□ Smartphone  □ Feature phone  □ None'
      ]
    }
  },
  {
    id: 'review',
    label: 'Review',
    title: 'Catch bias before publish',
    body: 'Structured findings flag leading language, missing options, and length risks — you decide what changes.',
    preview: {
      eyebrow: 'Review finding',
      lines: [
        'Medium · Leading phrasing',
        '“Don’t you agree that…”',
        'Suggested: neutral rewrite ready'
      ]
    }
  },
  {
    id: 'collect',
    label: 'Collect',
    title: 'Share a live link or QR',
    body: 'Publish a versioned public form. Respondents need no account. Close the round when you’re done.',
    preview: {
      eyebrow: 'Collection',
      lines: [
        'Status: Live · v2',
        'Link ready · QR downloadable',
        '42 responses so far'
      ]
    }
  },
  {
    id: 'analyze',
    label: 'Analyze',
    title: 'Figures from your data only',
    body: 'Charts and crosstabs come from stored answers — never invented. Ground every claim in the response set.',
    preview: {
      eyebrow: 'Analytics',
      lines: [
        'n = 42 complete',
        'Device access: 68% smartphone',
        'Export: CSV · ready'
      ]
    }
  },
  {
    id: 'report',
    label: 'Report',
    title: 'Write with receipts',
    body: 'Narrative stays AI-assisted; every statistic stays tied to a computation. No hallucinated percentages.',
    preview: {
      eyebrow: 'Report excerpt',
      lines: [
        '“Among 42 respondents…”',
        'Cite → analyze.device_access',
        'Confidence: data-backed'
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
        One workflow. Six stages.
      </h2>
      <p className='mx-auto mt-2 max-w-md text-center text-sm leading-relaxed text-muted-foreground'>
        From brief to report without leaving Survai — pick a stage to see what
        happens.
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
