const CLAIMS = [
  {
    title: 'AI never invents stats',
    body: 'Language models draft questions and prose. Percentages, counts, and charts come from your response data — or they don’t appear at all.',
    mark: '01'
  },
  {
    title: 'Deterministic analytics',
    body: 'Aggregations run in code against stored answers. Same dataset, same figures — every time you refresh the dashboard.',
    mark: '02'
  },
  {
    title: 'Review before publish',
    body: 'Structured findings land before a version goes live. You accept, edit, or ignore — nothing ships on autopilot.',
    mark: '03'
  }
] as const;

export function LandingTrust() {
  return (
    <section
      id='trust'
      className='landing-section scroll-mt-24 pt-16 sm:pt-24'
    >
      <div className='landing-shell overflow-hidden'>
        <div className='relative border-b border-border bg-brand-soft/60 px-5 py-8 sm:px-8 sm:py-10'>
          <div
            className='dot-grid absolute inset-0 opacity-50'
            aria-hidden='true'
          />
          <div className='relative max-w-xl'>
            <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[2.1rem]'>
              Numbers you can <span className='hl'>defend</span>
            </h2>
            <p className='mt-2.5 text-sm leading-relaxed text-muted-foreground'>
              Built for M&amp;E and research teams who can’t risk a hallucinated
              percentage in a donor report.
            </p>
          </div>
        </div>

        <ul>
          {CLAIMS.map((claim) => (
            <li
              key={claim.title}
              className='group grid gap-4 border-b border-border px-5 py-6 last:border-b-0 sm:grid-cols-[5.5rem_minmax(0,14rem)_1fr] sm:items-start sm:gap-6 sm:px-8 sm:py-8'
            >
              <span className='font-display text-4xl leading-none font-extrabold tracking-[-0.04em] text-foreground/10 transition-colors group-hover:text-brand sm:pt-0.5'>
                {claim.mark}
              </span>
              <div className='flex items-start gap-3'>
                <span className='landing-rail mt-1.5 hidden h-10 sm:block' aria-hidden='true' />
                <h3 className='font-display text-lg font-extrabold tracking-tight text-foreground'>
                  {claim.title}
                </h3>
              </div>
              <p className='text-sm leading-relaxed text-muted-foreground sm:pt-1'>
                {claim.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
