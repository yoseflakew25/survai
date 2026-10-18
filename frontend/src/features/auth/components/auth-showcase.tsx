import { SurvaiMark } from '@/components/survai-logo';

const LIFECYCLE_ROWS = [
  {
    step: 1,
    initials: 'PL',
    color: '#7c4dff',
    name: 'Plan',
    meta: 'Research design drafted with AI',
    value: '12',
    unit: 'questions'
  },
  {
    step: 2,
    initials: 'RV',
    color: '#4f9a00',
    name: 'Review',
    meta: 'Bias & clarity checks passed',
    value: '94',
    unit: 'quality'
  },
  {
    step: 3,
    initials: 'RP',
    color: '#0a84d6',
    name: 'Report',
    meta: 'Narrative grounded in live stats',
    value: '100%',
    unit: 'reconciled'
  }
] as const;

export function AuthShowcase() {
  return (
    <div className='hidden border-l border-border/40 lg:block lg:w-[55%] xl:w-[60%]'>
      <div className='auth-panel-tint relative h-full w-full overflow-hidden'>
        <div className='bg-grid' />
        <div className='bg-glow' />

        <SurvaiMark
          ghost
          className='absolute -right-[8%] -bottom-[10%] h-[55%] w-auto text-foreground opacity-[0.28] dark:opacity-[0.22]'
        />

        <div className='relative z-10 flex h-full flex-col items-center justify-center px-10'>
          <div className='w-full max-w-sm'>
            <p className='flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase'>
              <span className='live-dot' />
              Survey Copilot · M&amp;E ready
            </p>
            <p className='font-display mt-3 text-2xl leading-tight font-extrabold tracking-[-0.03em]'>
              From first question to final report — without inventing a single number.
            </p>

            <div className='board mt-6'>
              {LIFECYCLE_ROWS.map((row) => (
                <div key={row.name} className='board-row flex items-center gap-3 px-4 py-3'>
                  <span
                    className={
                      row.step === 1
                        ? 'grid h-6 w-6 place-items-center rounded-full bg-gold font-mono text-[11px] text-[#111210]'
                        : 'grid h-6 w-6 place-items-center rounded-full bg-foreground font-mono text-[11px] text-background'
                    }
                  >
                    {row.step}
                  </span>
                  <span
                    className='font-display grid h-9 w-9 place-items-center rounded-xl text-xs font-bold'
                    style={{
                      background: `color-mix(in srgb, ${row.color} 18%, var(--card))`,
                      color: row.color
                    }}
                  >
                    {row.initials}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-semibold'>{row.name}</span>
                    <span className='block truncate text-xs text-muted-foreground'>
                      {row.meta}
                    </span>
                  </span>
                  <span className='text-right'>
                    <span className='font-display block font-bold tabular-nums'>{row.value}</span>
                    <span className='block font-mono text-[10px] text-muted-foreground'>
                      {row.unit}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
