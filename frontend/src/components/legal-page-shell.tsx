import Link from 'next/link';
import type { ReactNode } from 'react';

import { SurvaiLogo } from '@/components/survai-logo';
import { SITE_YEAR } from '@/lib/site-year';

type LegalPageShellProps = {
  title: string;
  updated: string;
  children: ReactNode;
};

export function LegalPageShell({ title, updated, children }: LegalPageShellProps) {
  return (
    <div className='min-h-svh bg-background text-foreground'>
      <header className='border-b border-foreground/15'>
        <div className='mx-auto flex h-[var(--header-height)] max-w-3xl items-center justify-between px-4 sm:px-6'>
          <Link href='/' aria-label='Survai home'>
            <SurvaiLogo />
          </Link>
          <nav className='flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground'>
            <Link href='/privacy' className='transition-opacity hover:opacity-100 hover:text-foreground'>
              Privacy
            </Link>
            <Link href='/terms' className='transition-opacity hover:opacity-100 hover:text-foreground'>
              Terms
            </Link>
            <Link
              href='/auth/sign-in'
              className='border border-primary bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-brand hover:text-brand-foreground'
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className='mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14'>
        <header className='mb-10 border-b border-foreground/10 pb-8'>
          <h1 className='font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl'>{title}</h1>
          <p className='mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground'>
            Last updated {updated}
          </p>
        </header>

        <article className='legal-prose space-y-8 text-[15px] leading-relaxed text-foreground/90'>
          {children}
        </article>
      </main>

      <footer className='border-t border-foreground/15'>
        <div className='text-muted-foreground mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-6 font-mono text-[10px] uppercase tracking-[0.08em] sm:px-6'>
          <span>© {SITE_YEAR} Survai</span>
          <Link href='/privacy' className='hover:text-foreground'>
            Privacy
          </Link>
          <Link href='/terms' className='hover:text-foreground'>
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
      <h2 className='font-display text-xl font-semibold tracking-[-0.03em] text-foreground'>{title}</h2>
      <div className='text-muted-foreground space-y-3 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-3 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5'>
        {children}
      </div>
    </section>
  );
}