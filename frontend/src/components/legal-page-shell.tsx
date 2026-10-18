import Link from 'next/link';
import type { ReactNode } from 'react';

import { SurvaiLogo } from '@/components/survai-logo';

type LegalPageShellProps = {
  title: string;
  updated: string;
  children: ReactNode;
};

export function LegalPageShell({ title, updated, children }: LegalPageShellProps) {
  return (
    <div className='min-h-svh bg-background text-foreground'>
      <header className='border-b border-border'>
        <div className='mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6'>
          <Link href='/' aria-label='Survai home'>
            <SurvaiLogo />
          </Link>
          <nav className='flex items-center gap-4 text-sm text-muted-foreground'>
            <Link href='/privacy' className='hover:text-foreground transition-colors'>
              Privacy
            </Link>
            <Link href='/terms' className='hover:text-foreground transition-colors'>
              Terms
            </Link>
            <Link
              href='/auth/sign-in'
              className='rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:brightness-105'
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className='mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14'>
        <header className='mb-10'>
          <h1 className='font-display text-3xl font-extrabold tracking-tight sm:text-4xl'>
            {title}
          </h1>
          <p className='text-muted-foreground mt-2 text-sm'>Last updated {updated}</p>
        </header>

        <article className='legal-prose space-y-8 text-[15px] leading-relaxed text-foreground/90'>
          {children}
        </article>
      </main>

      <footer className='border-t border-border'>
        <div className='text-muted-foreground mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-6 text-xs sm:px-6'>
          <span>© {new Date().getFullYear()} Survai</span>
          <Link href='/privacy' className='hover:text-foreground transition-colors'>
            Privacy
          </Link>
          <Link href='/terms' className='hover:text-foreground transition-colors'>
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className='space-y-3'>
      <h2 className='font-display text-xl font-bold tracking-tight text-foreground'>
        {title}
      </h2>
      <div className='text-muted-foreground space-y-3 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-3 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5'>
        {children}
      </div>
    </section>
  );
}
