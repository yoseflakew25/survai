import Link from 'next/link';
import type { ReactNode } from 'react';

import { SurvaiLogo } from '@/components/survai-logo';
import { AuthShowcase } from '@/features/auth/components/auth-showcase';
import '@/features/board/styles.css';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className='lp flex min-h-screen bg-background'>
      <div className='flex min-h-screen w-full flex-col lg:w-[45%] xl:w-[40%]'>
        <header className='border-b border-border/40 lg:border-b-0'>
          <div className='px-6 sm:px-8 lg:px-10'>
            <div className='flex h-16 items-center justify-between'>
              <Link href='/' aria-label='Survai home'>
                <SurvaiLogo />
              </Link>
              <Link
                href='/'
                className='text-[13px] text-muted-foreground transition-colors hover:text-foreground'
              >
                Back
              </Link>
            </div>
          </div>
        </header>

        <main className='flex flex-1 items-center justify-center px-6 py-12 sm:px-8 lg:px-10'>
          <div className='w-full max-w-sm'>{children}</div>
        </main>

        <footer className='px-6 py-4 sm:px-8 lg:px-10'>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground/30'>
            <span>© {new Date().getFullYear()} Survai</span>
            <Link
              href='/privacy'
              className='transition-colors hover:text-muted-foreground/60'
            >
              Privacy
            </Link>
            <Link
              href='/terms'
              className='transition-colors hover:text-muted-foreground/60'
            >
              Terms
            </Link>
          </div>
        </footer>
      </div>

      <AuthShowcase />
    </div>
  );
}
