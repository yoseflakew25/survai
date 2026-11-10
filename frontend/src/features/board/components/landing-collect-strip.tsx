import Link from 'next/link';
import { IconChevronRight } from '@/features/board/components/launchpot-mark';

const BEATS = [
  {
    label: 'Draft',
    detail: 'Shape questions privately until the survey feels right.',
    hint: 'Private'
  },
  {
    label: 'Publish',
    detail: 'Go live when you’re ready — respondents see a clear, stable form.',
    hint: 'Live'
  },
  {
    label: 'Share',
    detail: 'Send a link or print a QR. No account needed to answer.',
    hint: 'Anywhere'
  },
  {
    label: 'Close',
    detail: 'End collection when outreach wraps. Your responses stay safe.',
    hint: 'Done'
  }
] as const;

export function LandingCollectStrip() {
  return (
    <section
      id='collect'
      className='landing-section scroll-mt-24 pt-16 sm:pt-24'
    >
      <div className='text-center'>
        <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[2.1rem]'>
          Collect in the field without the <span className='hl'>chaos</span>
        </h2>
        <p className='mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground'>
          Publish when ready, share a link or QR, and close the round when
          outreach ends — no orphaned open forms.
        </p>
      </div>

      <div className='relative mt-8 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] bg-[var(--primary)] p-1 shadow-sm'>
        <ol className='relative grid gap-1 sm:grid-cols-4'>
          {BEATS.map((beat, i) => (
            <li
              key={beat.label}
              className='group relative flex cursor-default flex-col gap-3 rounded-[1rem] bg-[var(--gold)] p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:brightness-105 sm:p-5'
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='flex size-9 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[var(--primary)] font-mono text-xs font-bold text-white shadow-sm transition-transform duration-200 group-hover:scale-110'>
                  {i + 1}
                </span>
                <span className='rounded-full border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[var(--primary)] uppercase'>
                  {beat.hint}
                </span>
              </div>
              <div>
                <p className='font-display text-2xl font-extrabold tracking-tight text-[var(--primary)]'>
                  {beat.label}
                </p>
                <p className='text-sm leading-relaxed text-[color-mix(in_srgb,var(--primary)_72%,transparent)]'>
                  {beat.detail}
                </p>
              </div>
              {i < BEATS.length - 1 ? (
                <span
                  className='absolute top-1/2 -right-1 z-10 hidden size-2 -translate-y-1/2 rounded-full bg-[var(--primary)] transition-transform duration-200 group-hover:scale-125 sm:block'
                  aria-hidden='true'
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className='mt-7 flex justify-center'>
        <Link href='/auth/sign-up' className='btn-back h-10 px-4 text-sm'>
          Start collecting
          <IconChevronRight className='h-4 w-4' />
        </Link>
      </div>
    </section>
  );
}
