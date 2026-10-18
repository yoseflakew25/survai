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
          Built for teams who turn surveys into <span className='hl'>decisions</span>
        </h2>
        <p className='mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground'>
          Shaped with Ethiopian civil society organizations — designed for
          research and program teams everywhere.
        </p>
      </div>

      <ul className='mt-8 space-y-3'>
        {AUDIENCES.map((item, i) => (
          <li
            key={item.title}
            className='group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-[color-mix(in_srgb,var(--brand)_45%,var(--border))]'
          >
            <div className='flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6'>
              <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-display text-lg font-extrabold text-brand-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_12%,transparent)] transition-transform group-hover:scale-105'>
                {String.fromCharCode(65 + i)}
              </div>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h3 className='font-display text-lg font-extrabold tracking-tight text-foreground'>
                    {item.title}
                  </h3>
                  <span className='rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'>
                    {item.tag}
                  </span>
                </div>
                <p className='mt-1.5 text-sm leading-relaxed text-muted-foreground'>
                  {item.body}
                </p>
              </div>
            </div>
            <div
              className='pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-brand-soft/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100'
              aria-hidden='true'
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
