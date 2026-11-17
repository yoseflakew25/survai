'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const STEP_IDS = [
  'plan',
  'build',
  'review',
  'collect',
  'analyze',
  'report'
] as const;

const LINE_KEYS = ['line1', 'line2', 'line3'] as const;

function hl(chunks: ReactNode) {
  return <span className='hl'>{chunks}</span>;
}

export function LandingLifecycle() {
  const t = useTranslations('landing');
  const [active, setActive] = useState(0);
  const step = STEP_IDS[active];

  return (
    <section
      id='lifecycle'
      className='landing-section scroll-mt-24 pt-16 sm:pt-20'
    >
      <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[2.1rem]'>
        {t.rich('lifecycle.title', { hl })}
      </h2>
      <p className='mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-muted-foreground'>
        {t('lifecycle.subtitle')}
      </p>

      <div
        role='tablist'
        aria-label={t('stages.aria')}
        className='mt-7 flex gap-1 overflow-x-auto rounded-full border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] bg-[var(--primary)] p-[3px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      >
        {STEP_IDS.map((id, i) => {
          const isActive = i === active;
          return (
            <button
              key={id}
              type='button'
              role='tab'
              aria-selected={isActive}
              id={`lifecycle-tab-${id}`}
              aria-controls='lifecycle-panel'
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-[var(--gold)] font-semibold text-[var(--brand-foreground)] shadow-sm'
                  : 'text-primary-foreground/70 hover:text-[var(--gold)]'
              )}
            >
              {t(`stages.${id}`)}
            </button>
          );
        })}
      </div>

      <div
        key={step}
        id='lifecycle-panel'
        role='tabpanel'
        aria-labelledby={`lifecycle-tab-${step}`}
        className='landing-panel-swap mt-5 grid gap-4 sm:grid-cols-[1fr_1.05fr] sm:items-stretch'
      >
        <div className='flex flex-col justify-center rounded-2xl border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] bg-[var(--primary)] p-5 shadow-sm sm:p-6'>
          <p className='font-mono text-[11px] font-medium tracking-wide text-[var(--gold)] uppercase'>
            {t('lifecycle.stageOf', {
              current: active + 1,
              total: STEP_IDS.length
            })}
          </p>
          <h3 className='font-display text-xl font-extrabold tracking-tight text-primary-foreground'>
            {t(`lifecycle.steps.${step}.title`)}
          </h3>
          <p className='mt-2 text-sm leading-relaxed text-primary-foreground/70'>
            {t(`lifecycle.steps.${step}.body`)}
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
              {t(`lifecycle.steps.${step}.eyebrow`)}
            </p>
            <ul className='space-y-2'>
              {LINE_KEYS.map((line) => (
                <li
                  key={`${step}-${line}`}
                  className='rounded-xl border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-card/90 px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm'
                >
                  {t(`lifecycle.steps.${step}.${line}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
