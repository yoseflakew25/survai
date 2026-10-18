import Link from 'next/link';
import { IconChevronRight } from '@/features/board/components/launchpot-mark';

export function LandingCta() {
  return (
    <section className='landing-section pt-16 pb-4 sm:pt-24'>
      <div className='relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)]'>
        <div
          className='pointer-events-none absolute inset-0 opacity-40'
          style={{
            backgroundImage:
              'linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            maskImage:
              'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, black 18%, black 82%, transparent)'
          }}
          aria-hidden='true'
        />
        <div className='relative flex flex-col items-center gap-5 px-6 py-12 text-center sm:px-10 sm:py-14'>
          <h2 className='font-display max-w-lg text-2xl font-extrabold tracking-[-0.03em] text-brand-foreground sm:text-[2rem]'>
            Ready to turn a research goal into a decision?
          </h2>
          <p className='max-w-sm text-sm leading-relaxed text-brand-foreground/75'>
            Design smarter surveys. Generate better insights. Make better
            decisions — starting with your next question.
          </p>
          <div className='flex flex-wrap items-center justify-center gap-2.5'>
            <Link
              href='/auth/sign-up'
              className='inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_14%,transparent)] bg-card px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-card/90'
            >
              Create account
              <IconChevronRight className='h-4 w-4' />
            </Link>
            <Link
              href='/dashboard/overview'
              className='inline-flex h-11 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--foreground)_18%,transparent)] px-5 text-sm font-medium text-brand-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]'
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
