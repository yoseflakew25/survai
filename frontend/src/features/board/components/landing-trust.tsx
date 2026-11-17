import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

const CLAIM_IDS = ['speed', 'evidence', 'approval'] as const;

function gold(chunks: ReactNode) {
  return (
    <span className='text-[var(--gold)] underline decoration-[var(--gold)] decoration-2 underline-offset-4'>
      {chunks}
    </span>
  );
}

export function LandingTrust() {
  const t = useTranslations('landing');

  return (
    <section id='trust' className='landing-section scroll-mt-24 pt-16 sm:pt-24'>
      <div className='landing-shell overflow-hidden'>
        <div className='relative border-b border-[color-mix(in_srgb,var(--gold)_35%,transparent)] bg-[var(--primary)] px-5 py-8 sm:px-8'>
          <div
            className='dot-grid absolute inset-0 opacity-40'
            aria-hidden='true'
            style={{
              backgroundImage:
                'radial-gradient(color-mix(in srgb, var(--gold) 28%, transparent) 1px, transparent 1px)'
            }}
          />
          <div className='relative max-w-xl'>
            <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-primary-foreground sm:text-[2.1rem]'>
              {t.rich('trust.title', { gold })}
            </h2>
            <p className='text-sm leading-relaxed text-primary-foreground/75'>
              {t('trust.subtitle')}
            </p>
          </div>
        </div>

        <ul>
          {CLAIM_IDS.map((id, i) => (
            <li
              key={id}
              className='group grid gap-4 border-b border-border px-5 py-6 last:border-b-0 sm:grid-cols-[5.5rem_minmax(0,14rem)_1fr] sm:items-start sm:gap-6 sm:px-8 sm:py-8'
            >
              <span className='font-display text-4xl leading-none font-extrabold tracking-[-0.04em] text-foreground/10 transition-colors group-hover:text-brand sm:pt-0.5'>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className='flex items-start gap-3'>
                <span
                  className='landing-rail .5 hidden h-10 sm:block'
                  aria-hidden='true'
                />
                <h3 className='font-display text-2xl font-extrabold tracking-tight text-foreground'>
                  {t(`trust.claims.${id}.title`)}
                </h3>
              </div>
              <p className='text-sm leading-relaxed text-muted-foreground sm:pt-1'>
                {t(`trust.claims.${id}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
