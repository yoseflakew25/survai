const AUDIENCES = [
  {
    title: 'Program & M&E officers',
    body: 'Move from research goal to donor-ready report without losing weeks in spreadsheets and Word drafts.',
    tag: 'Impact evidence'
  },
  {
    title: 'CSOs & NGOs',
    body: 'Run training evaluations, needs assessments, and beneficiary feedback — then share findings with partners and funders.',
    tag: 'Field to funder'
  },
  {
    title: 'Researchers & policy teams',
    body: 'Design clearer questions, catch bias early, and explore results until the decision is obvious.',
    tag: 'Better questions'
  },
  {
    title: 'Leaders & managers',
    body: 'Skip the raw tables. Get concise summaries and recommendations you can use in the next meeting.',
    tag: 'Quick clarity'
  }
] as const;

export function LandingAudience() {
  return (
    <section
      id='audience'
      className='landing-section relative scroll-mt-24 pt-16 sm:pt-24'
    >
      <div
        className='dot-grid absolute inset-x-0 top-10 -z-10 h-48 opacity-60'
        aria-hidden='true'
      />

      <div className='text-center'>
        <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[2.1rem]'>
          Built for teams who turn surveys into{' '}
          <span className='hl'>decisions</span>
        </h2>
        <p className='mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground'>
          Shaped with Ethiopian civil society organizations — designed for
          research and program teams everywhere.
        </p>
      </div>

      <ul className='mt-8 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] bg-[var(--primary)] shadow-sm'>
        {AUDIENCES.map((item, i) => (
          <li
            key={item.title}
            className='group grid gap-4 border-b border-[color-mix(in_srgb,var(--gold)_18%,transparent)] px-5 py-5 transition-colors duration-200 last:border-b-0 hover:bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] sm:grid-cols-[3rem_minmax(0,1fr)] sm:items-start sm:gap-5 sm:px-6 sm:py-6'
          >
            <span
              className='flex size-11 items-center justify-center rounded-xl bg-[var(--gold)] font-display text-base font-extrabold text-[var(--primary)] shadow-sm transition-transform duration-200 group-hover:scale-105'
              aria-hidden='true'
            >
              {String.fromCharCode(65 + i)}
            </span>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-baseline gap-x-2.5 gap-y-1'>
                <h3 className='font-display text-2xl font-extrabold tracking-tight text-primary-foreground sm:text-xl'>
                  {item.title}
                </h3>
                <span className='font-mono text-[10px] font-semibold tracking-[0.08em] text-[var(--gold)] uppercase'>
                  {item.tag}
                </span>
              </div>
              <p className='mt-1.5 max-w-2xl text-sm leading-relaxed text-primary-foreground/70'>
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
