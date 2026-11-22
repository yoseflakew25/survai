'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { SurvaiLogo } from '@/components/survai-logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { AuthShowcase } from '@/features/auth/components/auth-showcase';
import { SITE_YEAR } from '@/lib/site-year';
import '@/features/auth/styles/auth-v2.css';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  const t = useTranslations('common');
  const tAuth = useTranslations('auth');

  return (
    <div className='auth-v2-root'>
      <header className='auth-hdr'>
        <div className='auth-hdr-left'>
          <Link href='/' className='auth-hdr-logo' aria-label={tAuth('homeAria')}>
            <SurvaiLogo className='auth-hdr-wordmark' />
          </Link>
        </div>
        <div className='auth-hdr-right'>
          <div className='auth-hdr-lang'>
            <LanguageSwitcher compact />
          </div>
          <Link href='/' className='auth-hdr-back'>
            {t('back')}
          </Link>
        </div>
      </header>

      <div className='auth-body'>
        <div className='auth-form-col'>
          <main className='auth-form-main'>
            <div className='auth-form-inner'>{children}</div>
          </main>
          <footer className='auth-form-foot'>
            <span>{t('copyright', { year: SITE_YEAR })}</span>
            <Link href='/privacy'>{t('privacy')}</Link>
            <Link href='/terms'>{t('terms')}</Link>
          </footer>
        </div>

        <AuthShowcase />
      </div>
    </div>
  );
}
