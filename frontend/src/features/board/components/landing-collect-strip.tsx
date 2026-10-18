import Link from 'next/link';
import { IconChevronRight } from '@/features/board/components/launchpot-mark';

const BEATS = [
  {
    label: 'Draft',
    detail: 'Edit questions freely while the instrument is still soft.',
    hint: 'Private'
  },
  {
    label: 'Publish',
    detail: 'Freeze a versioned snapshot respondents will actually see.',
    hint: 'Versioned'
  },
  {
    label: 'Share',
    detail: 'Send a link or print a QR — no account needed to answer.',
    hint: 'Public'
  },
  {
    label: 'Close',
    detail: 'Stop new starts when outreach ends. Existing data stays.',
    hint: 'Sealed'
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
          Collection that stays under <span className='hl'>control</span>
        </h2>
        <p className='mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground'>
          Publish when ready. Share widely. Close the round when outreach ends —
          no mystery open forms.
        </p>
      </div>

      <div className='landing-shell-brand relative mt-8 overflow-hidden rounded-2xl p-1'>
        <div className='landing-grid-wash' aria-hidden='true' />
        <ol className='relative grid gap-1 sm:grid-cols-4'>
          {BEATS.map((beat, i) => (
            <li
              key={beat.label}
              className='group relative flex cursor-default flex-col gap-3 rounded-[1rem] bg-card/95 p-4 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-soft hover:shadow-md sm:p-5'
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='flex size-9 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-mono text-xs font-bold text-brand-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_12%,transparent)] transition-transform duration-200 group-hover:scale-110'>
                  {i + 1}
                </span>
                <span className='rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase transition-colors duration-200 group-hover:border group-hover:border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] group-hover:bg-card group-hover:text-foreground'>
                  {beat.hint}
                </span>
              </div>
              <div>
                <p className='font-display text-lg font-extrabold tracking-tight text-foreground'>
                  {beat.label}
                </p>
                <p className='mt-1 text-sm leading-relaxed text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80'>
                  {beat.detail}
                </p>
              </div>
              {i < BEATS.length - 1 ? (
                <span
                  className='absolute top-1/2 -right-1 z-10 hidden size-2 -translate-y-1/2 rounded-full bg-brand transition-transform duration-200 group-hover:scale-125 sm:block'
                  aria-hidden='true'
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className='mt-7 flex justify-center'>
        <Link href='/auth/sign-up' className='btn-back h-10 px-4 text-sm'>
          Publish your first round
          <IconChevronRight className='h-4 w-4' />
        </Link>
      </div>
    </section>
  );
}
