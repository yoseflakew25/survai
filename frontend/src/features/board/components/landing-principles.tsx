const PRINCIPLES = [
  {
    title: 'AI assists — you decide',
    body: 'Suggestions, drafts, and explanations are always editable. Nothing publishes or reports without your judgment.'
  },
  {
    title: 'Numbers come from your data',
    body: 'Counts, percentages, and charts are calculated from real responses — never invented to fill a narrative.'
  },
  {
    title: 'Simple enough for busy teams',
    body: 'You don’t need a research degree to run a solid survey. Clear defaults; deeper tools when you want them.'
  },
  {
    title: 'Respect for respondents',
    body: 'Collect only what you need. Share a simple link. Keep sensitive answers under your organization’s control.'
  }
] as const;

export function LandingPrinciples() {
  return (
    <section
      id='principles'
      className='landing-section scroll-mt-24 pt-16 sm:pt-24'
    >
      <div className='grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)] lg:items-start lg:gap-10'>
        <div className='landing-shell-brand group/panel relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ease-out hover:brightness-[1.03] hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_30%,transparent)] sm:p-8'>
          <div className='landing-grid-wash' aria-hidden='true' />
          <div className='relative'>
            <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-brand-foreground sm:text-[2rem]'>
              How we earn your trust
            </h2>
            <p className='mt-3 text-sm leading-relaxed text-brand-foreground/75'>
              The same standards we’d want if our own program evidence were on
              the line — for boards, donors, and communities.
            </p>
            <div className='mt-8 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--foreground)_14%,transparent)] bg-card/90 px-3 py-1.5 font-mono text-[11px] font-medium text-foreground shadow-sm transition-all duration-200 group-hover/panel:translate-y-[-1px] group-hover/panel:shadow-md'>
              <span className='live-dot' aria-hidden='true' />
              Human-controlled by design
            </div>
          </div>
        </div>

        <ol className='space-y-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
          {PRINCIPLES.map((item, i) => (
            <li
              key={item.title}
              className='group flex cursor-default gap-4 border-b border-border px-5 py-5 transition-colors duration-200 last:border-b-0 hover:bg-brand-soft/60 sm:gap-5 sm:px-6 sm:py-6'
            >
              <span
                className='mt-1 font-display text-2xl leading-none font-extrabold tracking-[-0.04em] text-brand tabular-nums transition-transform duration-200 group-hover:scale-110 group-hover:text-brand-strong'
                aria-hidden='true'
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className='min-w-0'>
                <h3 className='font-display text-base font-extrabold tracking-tight text-foreground sm:text-lg'>
                  {item.title}
                </h3>
                <p className='mt-1.5 text-sm leading-relaxed text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80'>
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
