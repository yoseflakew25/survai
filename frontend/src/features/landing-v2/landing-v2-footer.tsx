'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';
import { SurvaiLockup } from '@/components/survai-logo';

function SignUpLink({ className, children, ...rest }: Omit<ComponentProps<typeof Link>, 'href'>) {
  return (
    <Link href='/auth/sign-up' className={className} {...rest}>
      {children}
    </Link>
  );
}

function scrollPageToTop() {
  const top = document.getElementById('top');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (top) {
    top.focus({ preventScroll: true });
    top.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    return;
  }
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

export function LandingV2Footer() {
  const t = useTranslations('landing');
  const year = new Date().getFullYear();

  return (
    <footer className='ftr' id='get-started'>
      <div className='ftr-top cell-grey'>
        <div className='ftr-close-copy'>
          <h2 className='ftr-close'>{t('cta.title')}</h2>
          <div className='ftr-close-actions'>
            <SignUpLink className='btn-dark'>
              <span className='roll'>
                <span>{t('cta.create')}</span>
                <span>{t('cta.create')}</span>
              </span>
              <svg className='arr' viewBox='0 0 16 16' aria-hidden='true'>
                <path d='M1 8h13M9 3l5 5-5 5' />
              </svg>
            </SignUpLink>
            <Link className='mono-link' href='/dashboard/overview'>
              <span className='roll'>
                <span>{t('cta.dashboard')}</span>
                <span>{t('cta.dashboard')}</span>
              </span>
              <svg className='arr' viewBox='0 0 16 16' aria-hidden='true'>
                <path d='M1 8h13M9 3l5 5-5 5' />
              </svg>
            </Link>
          </div>
        </div>

        <div className='ftr-top-side'>
          <nav className='ftr-nav' aria-label='Footer'>
            <a href='#lifecycle'>
              <span className='roll'>
                <span>{t('nav.lifecycle')}</span>
                <span>{t('nav.lifecycle')}</span>
              </span>
            </a>
            <a href='#about'>
              <span className='roll'>
                <span>{t('nav.about')}</span>
                <span>{t('nav.about')}</span>
              </span>
            </a>
            <a href='#faq'>
              <span className='roll'>
                <span>{t('nav.faq')}</span>
                <span>{t('nav.faq')}</span>
              </span>
            </a>
          </nav>
          <a
            className='ftr-cell'
            href='#top'
            onClick={(e) => {
              e.preventDefault();
              scrollPageToTop();
            }}
          >
            {t('footer.backToTop')}
            <svg className='arr-ne' viewBox='0 0 12 12' aria-hidden='true'>
              <path d='M6 11V1M2 5l4-4 4 4' />
            </svg>
          </a>
        </div>
      </div>

      <div className='ftr-bot'>
        <div className='ftr-brand cell-dark'>
          <div className='ftr-brand-main'>
            <SurvaiLockup className='ftr-lockup-svg' onDark />
            <p className='ftr-tagline'>{t('footer.tagline')}</p>
          </div>
          <div className='ftr-legal'>
            <span>{t('footer.copyright', { year })}</span>
            <span>{t('footer.shaped')}</span>
          </div>
        </div>
        <SignUpLink className='ftr-cta cell-mint' id='footer-contact'>
          <div className='ftr-cta-top'>
            <p className='ftr-cta-kicker'>{t('nav.getStarted')}</p>
            <p className='ftr-cta-title'>{t('cta.create')}</p>
          </div>
          <div className='ftr-cta-bot'>
            <p className='ftr-cta-note'>{t('footer.ctaNote')}</p>
            <svg className='big-arrow' viewBox='0 0 120 120' aria-hidden='true'>
              <path d='M1 119L119 1M1 1h118v118' />
            </svg>
          </div>
        </SignUpLink>
      </div>
    </footer>
  );
}