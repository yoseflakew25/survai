'use client';

import Link from 'next/link';

import { SITE_YEAR } from '@/lib/site-year';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { SurvaiLogo } from '@/components/survai-logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { AuthShowcase } from '@/features/auth/components/auth-showcase';
import '@/features/board/styles.css';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  const t = useTranslations('common');
  const tAuth = useTranslations('auth');

  return (
    <div className='lp flex min-h-screen bg-background'>
      <div className='flex min-h-screen w-full flex-col lg:w-[45%] xl:w-[40%]'>
        <header className='border-b border-border/40 lg:border-b-0'>
          <div className='px-6 sm:px-8 lg:px-10'>
            <div className='flex h-16 items-center justify-between gap-3'>
              <Link href='/' aria-label={tAuth('homeAria')}>
                <SurvaiLogo />
              </Link>
              <div className='flex items-center gap-2'>
                <LanguageSwitcher />
                <Link
                  href='/'
                  className='text-[13px] text-muted-foreground transition-colors hover:text-foreground'
                >
                  {t('back')}
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className='flex flex-1 items-center justify-center px-6 py-12 sm:px-8 lg:px-10'>
          <div className='w-full max-w-sm'>{children}</div>
        </main>

        <footer className='px-6 py-4 sm:px-8 lg:px-10'>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/30'>
            <span>{t('copyright', { year: SITE_YEAR })}</span>
            <Link href='/privacy' className='transition-colors hover:text-muted-foreground/60'>
              {t('privacy')}
            </Link>
            <Link href='/terms' className='transition-colors hover:text-muted-foreground/60'>
              {t('terms')}
            </Link>
          </div>
        </footer>
      </div>

      <AuthShowcase />
    </div>
  );
}
