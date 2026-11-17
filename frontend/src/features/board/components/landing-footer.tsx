import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { SurvaiLogo } from '@/components/survai-logo';
import { SITE_YEAR } from '@/lib/site-year';

const PRODUCT = [
  { href: '#lifecycle', labelKey: 'nav.lifecycle' },
  { href: '#contrast', labelKey: 'nav.why' },
  { href: '#demo', labelKey: 'nav.tryIt' },
  { href: '#principles', labelKey: 'nav.principles' },
  { href: '#faq', labelKey: 'nav.faq' }
] as const;

const PRODUCT_LINKS = [
  { href: '/auth/sign-up', labelKey: 'cta.create' },
  { href: '/dashboard/overview', labelKey: 'footer.dashboard' },
  { href: '/auth/sign-in', labelKey: 'nav.signIn' }
] as const;

const LEGAL = [
  { href: '/privacy', labelKey: 'footer.privacy' },
  { href: '/terms', labelKey: 'footer.terms' }
] as const;

const STAGES = [
  'plan',
  'build',
  'review',
  'collect',
  'analyze',
  'report'
] as const;

function emphasis(chunks: ReactNode) {
  return <span className='font-medium text-foreground'>{chunks}</span>;
}

export function LandingFooter() {
  const t = useTranslations('landing');

  return (
    <footer className='0 border-t border-border bg-[color-mix(in_srgb,var(--secondary)_55%,var(--background))]'>
      <div className='mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-14'>
        <div className='flex flex-col gap-10 lg:flex-row lg:justify-between'>
          <div className='max-w-sm space-y-4'>
            <Link href='/' aria-label={t('nav.home')} className='inline-flex'>
              <SurvaiLogo />
            </Link>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              {t('footer.tagline')}
            </p>
            <div aria-label={t('footer.stagesAria')} className='flex flex-wrap gap-1'>
              {STAGES.map((stage) => (
                <span
                  key={stage}
                  className='rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'
                >
                  {t(`stages.${stage}`)}
                </span>
              ))}
            </div>
            <p className='inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-soft/70 px-2.5 py-1 font-mono text-[11px] font-medium text-foreground'>
              <span className='live-dot' aria-hidden='true' />
              {t('footer.shaped')}
            </p>
          </div>

          <div className='grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12'>
            <nav aria-label={t('footer.onThisPage')}>
              <p className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                {t('footer.product')}
              </p>
              <ul className='mt-3.5 space-y-2.5'>
                {PRODUCT.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className='group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground'
                    >
                      <span
                        className='size-1 rounded-full bg-border transition-colors group-hover:bg-brand'
                        aria-hidden='true'
                      />
                      {t(item.labelKey)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={t('footer.getStarted')}>
              <p className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                {t('footer.getStarted')}
              </p>
              <ul className='mt-3.5 space-y-2.5'>
                {PRODUCT_LINKS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className='group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground'
                    >
                      <span
                        className='size-1 rounded-full bg-border transition-colors group-hover:bg-brand'
                        aria-hidden='true'
                      />
                      {t(item.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={t('footer.legal')} className='col-span-2 sm:col-span-1'>
              <p className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                {t('footer.legal')}
              </p>
              <ul className='mt-3.5 space-y-2.5'>
                {LEGAL.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className='group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground'
                    >
                      <span
                        className='size-1 rounded-full bg-border transition-colors group-hover:bg-brand'
                        aria-hidden='true'
                      />
                      {t(item.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className='2 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between'>
          <p className='font-mono text-[11px] text-muted-foreground'>
            {t('footer.copyright', { year: SITE_YEAR })}
          </p>
          <p className='text-[11px] text-muted-foreground'>
            {t.rich('footer.control', { em: emphasis })}
          </p>
        </div>
      </div>
    </footer>
  );
}
