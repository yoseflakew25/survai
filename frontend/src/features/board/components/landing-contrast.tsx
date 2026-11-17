'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const SIDES = [
  { id: 'fragmented', tone: 'muted' },
  { id: 'survai', tone: 'brand' }
] as const;

const POINT_KEYS = ['point1', 'point2', 'point3'] as const;

function hl(chunks: ReactNode) {
  return <span className='hl'>{chunks}</span>;
}

export function LandingContrast() {
  const t = useTranslations('landing');
  const [focus, setFocus] = useState<(typeof SIDES)[number]['id']>('survai');

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
          {t.rich('contrast.title', { hl })}
        </h2>
        <p className='mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground'>
          {t('contrast.subtitle')}
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
                  : 'bg-[var(--primary)] text-primary-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            {t(`contrast.${side.id}.label`)}
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
                  : 'border-[color-mix(in_srgb,var(--gold)_30%,transparent)] bg-[var(--primary)] shadow-sm',
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
                        isBrand
                          ? 'text-brand-foreground'
                          : 'text-primary-foreground',
                        !isBrand &&
                          'line-through decoration-primary-foreground/30'
                      )}
                    >
                      {t(`contrast.${side.id}.label`)}
                    </h3>
                    <p
                      className={cn(
                        'font-mono text-[11px] font-semibold tracking-wide uppercase',
                        isBrand
                          ? 'text-brand-foreground/70'
                          : 'text-[var(--gold)]'
                      )}
                    >
                      {t(`contrast.${side.id}.verdict`)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold',
                      isBrand
                        ? 'border-[color-mix(in_srgb,var(--foreground)_18%,transparent)] bg-card text-foreground'
                        : 'border-[color-mix(in_srgb,var(--gold)_40%,transparent)] bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] text-[var(--gold)]'
                    )}
                    aria-hidden='true'
                  >
                    {isBrand ? '✓' : '—'}
                  </span>
                </div>
                <ul className='mt-5 space-y-3'>
                  {POINT_KEYS.map((point) => (
                    <li
                      key={point}
                      className={cn(
                        'flex gap-3 rounded-xl px-3 py-2.5 text-sm leading-relaxed',
                        isBrand
                          ? 'border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-card/90 font-medium text-foreground shadow-sm'
                          : 'bg-primary-foreground/10 text-primary-foreground/75'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 size-1.5 shrink-0 rounded-full',
                          isBrand ? 'bg-brand-strong' : 'bg-[var(--gold)]'
                        )}
                        aria-hidden='true'
                      />
                      {t(`contrast.${side.id}.${point}`)}
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
