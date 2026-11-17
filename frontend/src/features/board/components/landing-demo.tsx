'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { IconChevronRight } from '@/features/board/components/launchpot-mark';

const TYPES = ['single', 'rating', 'open'] as const;

type DemoType = (typeof TYPES)[number];

const CHOICES = ['skill', 'community', 'work', 'other'] as const;

type ChoiceId = (typeof CHOICES)[number];

const QUESTION_KEY = {
  single: 'demo.qSingle',
  rating: 'demo.qRating',
  open: 'demo.qOpen'
} as const;

function hl(chunks: ReactNode) {
  return <span className='hl'>{chunks}</span>;
}

export function LandingDemo() {
  const t = useTranslations('landing');
  const [type, setType] = useState<DemoType>('single');
  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [rating, setRating] = useState(0);
  const [openText, setOpenText] = useState('');

  return (
    <section id='demo' className='landing-section scroll-mt-24 pt-16 sm:pt-20'>
      <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[2.1rem]'>
        {t.rich('demo.title', { hl })}
      </h2>
      <p className='mx-auto mt-2 max-w-md text-center text-sm leading-relaxed text-muted-foreground'>
        {t('demo.subtitle')}
      </p>

      <div className='mt-7 overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
        <div className='flex gap-1 overflow-x-auto border-b border-[color-mix(in_srgb,var(--gold)_30%,transparent)] bg-[var(--primary)] p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          {TYPES.map((id) => {
            const isActive = type === id;
            return (
              <button
                key={id}
                type='button'
                onClick={() => setType(id)}
                className={cn(
                  'h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--gold)] font-semibold text-[var(--brand-foreground)] shadow-sm'
                    : 'text-primary-foreground/70 hover:text-[var(--gold)]'
                )}
              >
                {t(`demo.types.${id}`)}
              </button>
            );
          })}
        </div>

        <div className='space-y-4 p-5 sm:p-6'>
          <div>
            <p className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
              {t('demo.sample')}
            </p>
            <p className=' text-base font-semibold tracking-tight text-foreground'>
              {t(QUESTION_KEY[type])}
            </p>
          </div>

          {type === 'single' ? (
            <div
              role='radiogroup'
              aria-label={t('demo.choiceAria')}
              className='space-y-2'
            >
              {CHOICES.map((id) => {
                const selected = choice === id;
                return (
                  <button
                    key={id}
                    type='button'
                    role='radio'
                    aria-checked={selected}
                    onClick={() => setChoice(id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-colors',
                      selected
                        ? 'border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand-soft text-foreground'
                        : 'border-border bg-background hover:border-foreground/25'
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-4 shrink-0 place-items-center rounded-full border',
                        selected
                          ? 'border-foreground bg-foreground'
                          : 'border-border'
                      )}
                      aria-hidden='true'
                    >
                      {selected ? (
                        <span className='size-1.5 rounded-full bg-background' />
                      ) : null}
                    </span>
                    {t(`demo.choices.${id}`)}
                  </button>
                );
              })}
            </div>
          ) : null}

          {type === 'rating' ? (
            <div className='space-y-3'>
              <div
                role='group'
                aria-label={t('demo.ratingAria')}
                className='flex flex-wrap gap-2'
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const selected = rating === n;
                  return (
                    <button
                      key={n}
                      type='button'
                      aria-pressed={selected}
                      onClick={() => setRating(n)}
                      className={cn(
                        'flex size-11 items-center justify-center rounded-xl border font-mono text-sm font-semibold tabular-nums transition-colors',
                        selected
                          ? 'border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-brand-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_12%,transparent)]'
                          : 'border-border bg-background text-foreground hover:border-foreground/25'
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <div className='flex justify-between font-mono text-[11px] text-muted-foreground'>
                <span>{t('demo.notUseful')}</span>
                <span>{t('demo.veryUseful')}</span>
              </div>
            </div>
          ) : null}

          {type === 'open' ? (
            <textarea
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              rows={3}
              aria-label={t('demo.placeholder')}
              placeholder={t('demo.placeholder')}
              className='w-full resize-none rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/40 focus:outline-none'
            />
          ) : null}

          <div className='flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4'>
            <p className='font-mono text-[11px] text-muted-foreground'>
              {t('demo.note')}
            </p>
            <Link href='/auth/sign-up' className='btn-back h-10 px-4 text-sm'>
              {t('demo.cta')}
              <IconChevronRight className='h-4 w-4' />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
