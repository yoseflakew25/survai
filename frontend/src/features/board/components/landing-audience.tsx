const AUDIENCES = [
  {
    title: 'M&E teams',
    body: 'Instruments that survive audit — clear logic, versioned publish, figures with a paper trail.',
    tag: 'Audit trail'
  },
  {
    title: 'CSOs & programs',
    body: 'Collect in the field with a link or QR. No respondent accounts. Close the round when outreach ends.',
    tag: 'Field ready'
  },
  {
    title: 'Researchers',
    body: 'Draft faster without surrendering rigor. AI shapes language; you keep every methodological call.',
    tag: 'Method first'
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
          Built for people who ship <span className='hl'>evidence</span>
        </h2>
        <p className='mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground'>
          Survai fits teams who need trustworthy surveys — not another chatbot
          dashboard.
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
