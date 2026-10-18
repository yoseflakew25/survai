import Link from 'next/link';

import { SurvaiLogo } from '@/components/survai-logo';

const PRODUCT = [
  { href: '#lifecycle', label: 'Lifecycle' },
  { href: '#contrast', label: 'Why Survai' },
  { href: '#demo', label: 'Try it' },
  { href: '#principles', label: 'Principles' },
  { href: '#faq', label: 'FAQ' }
] as const;

const PRODUCT_LINKS = [
  { href: '/auth/sign-up', label: 'Create account' },
  { href: '/dashboard/overview', label: 'Dashboard' },
  { href: '/auth/sign-in', label: 'Sign in' }
] as const;

const LEGAL = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' }
] as const;

const STAGES = [
  'Plan',
  'Build',
  'Review',
  'Collect',
  'Analyze',
  'Report'
] as const;

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className='mt-10 border-t border-border bg-[color-mix(in_srgb,var(--secondary)_55%,var(--background))]'>
      <div className='mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-14'>
          <div className='flex flex-col gap-10 lg:flex-row lg:justify-between'>
            <div className='max-w-sm space-y-4'>
              <Link href='/' aria-label='Survai home' className='inline-flex'>
                <SurvaiLogo />
              </Link>
              <p className='text-sm leading-relaxed text-muted-foreground'>
                Design smarter surveys. Generate better insights. Make better
                decisions — from research goal to actionable report.
              </p>
              <div
                aria-label='Lifecycle stages'
                className='flex flex-wrap gap-1'
              >
                {STAGES.map((stage) => (
                  <span
                    key={stage}
                    className='rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'
                  >
                    {stage}
                  </span>
                ))}
              </div>
              <p className='inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-soft/70 px-2.5 py-1 font-mono text-[11px] font-medium text-foreground'>
                <span className='live-dot' aria-hidden='true' />
                Shaped with Ethiopian CSOs
              </p>
            </div>

            <div className='grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12'>
              <nav aria-label='On this page'>
                <p className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                  Product
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
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav aria-label='Get started'>
                <p className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                  Get started
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
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav aria-label='Legal' className='col-span-2 sm:col-span-1'>
                <p className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                  Legal
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
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>

        <div className='mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between'>
          <p className='font-mono text-[11px] text-muted-foreground'>
            © {year} Survai. All rights reserved.
          </p>
          <p className='text-[11px] text-muted-foreground'>
            An AI-assisted survey lifecycle —{' '}
            <span className='font-medium text-foreground'>
              you stay in control.
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
