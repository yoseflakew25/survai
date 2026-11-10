import Link from 'next/link';
import { IconChevronRight } from '@/features/board/components/launchpot-mark';

export function LandingCta() {
  return (
    <section className='landing-section pt-16 pb-4 sm:pt-24'>
      <div className='relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent),0_18px_40px_-28px_color-mix(in_srgb,var(--foreground)_35%,transparent)]'>
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
        <div className='relative flex flex-col items-center gap-5 px-6 py-12 text-center sm:gap-6 sm:px-10 sm:py-14'>
          <h2 className='font-display max-w-lg text-2xl font-extrabold tracking-[-0.03em] text-brand-foreground sm:text-4xl'>
            Ready to turn a research goal into a decision?
          </h2>
          <p className='max-w-md text-lg leading-relaxed text-brand-foreground/75'>
            Design smarter surveys. Generate better insights. Make better
            decisions — starting with your next question.
          </p>
          <div className='flex w-full max-w-xs flex-col items-stretch gap-2.5 sm:max-w-none sm:w-auto sm:flex-row sm:items-center sm:justify-center'>
            <Link
              href='/auth/sign-up'
              className='inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-transparent bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--primary)_88%,black)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]'
            >
              Create account
              <IconChevronRight className='h-4 w-4' />
            </Link>
            <Link
              href='/dashboard/overview'
              className='inline-flex h-11 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-transparent px-5 text-sm font-medium text-brand-foreground transition-[transform,background-color,color] duration-200 hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]'
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
