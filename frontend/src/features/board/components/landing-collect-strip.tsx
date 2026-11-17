import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { IconChevronRight } from '@/features/board/components/launchpot-mark';

const BEAT_IDS = ['draft', 'publish', 'share', 'close'] as const;

function hl(chunks: ReactNode) {
  return <span className='hl'>{chunks}</span>;
}

export function LandingCollectStrip() {
  const t = useTranslations('landing');

  return (
    <section
      id='collect'
      className='landing-section scroll-mt-24 pt-16 sm:pt-24'
    >
      <div className='text-center'>
        <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[2.1rem]'>
          {t.rich('collect.title', { hl })}
        </h2>
        <p className='mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground'>
          {t('collect.subtitle')}
        </p>
      </div>

      <div className='relative mt-8 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] bg-[var(--primary)] p-1 shadow-sm'>
        <ol className='relative grid gap-1 sm:grid-cols-4'>
          {BEAT_IDS.map((id, i) => (
            <li
              key={id}
              className='group relative flex cursor-default flex-col gap-3 rounded-[1rem] bg-[var(--gold)] p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:brightness-105 sm:p-5'
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='flex size-9 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand-foreground)_28%,transparent)] bg-[color-mix(in_srgb,var(--brand-foreground)_12%,transparent)] font-mono text-xs font-bold text-[var(--brand-foreground)] shadow-sm transition-transform duration-200 group-hover:scale-110'>
                  {i + 1}
                </span>
                <span className='rounded-full border border-[color-mix(in_srgb,var(--brand-foreground)_25%,transparent)] bg-[color-mix(in_srgb,var(--brand-foreground)_10%,transparent)] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[var(--brand-foreground)] uppercase'>
                  {t(`collect.beats.${id}.hint`)}
                </span>
              </div>
              <div>
                <p className='font-display text-2xl font-extrabold tracking-tight text-[var(--brand-foreground)]'>
                  {t(`collect.beats.${id}.label`)}
                </p>
                <p className='text-sm leading-relaxed text-[color-mix(in_srgb,var(--brand-foreground)_72%,transparent)]'>
                  {t(`collect.beats.${id}.detail`)}
                </p>
              </div>
              {i < BEAT_IDS.length - 1 ? (
                <span
                  className='absolute top-1/2 -right-1 z-10 hidden size-2 -translate-y-1/2 rounded-full bg-[var(--brand-foreground)] transition-transform duration-200 group-hover:scale-125 sm:block'
                  aria-hidden='true'
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className='mt-7 flex justify-center'>
        <Link href='/auth/sign-up' className='btn-back h-10 px-4 text-sm'>
          {t('collect.cta')}
          <IconChevronRight className='h-4 w-4' />
        </Link>
      </div>
    </section>
  );
}
