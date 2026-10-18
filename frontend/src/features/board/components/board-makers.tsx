import Link from 'next/link';

import { IconChevronRight } from '@/features/board/components/launchpot-mark';
import { BoardMaker, formatEtb } from '@/features/board/data';

export function BoardMakers({ makers }: { makers: BoardMaker[] }) {
  return (
    <section id='makers' className='mt-12'>
      <div className='mb-3 flex items-baseline justify-between'>
        <h2 className='font-display text-lg font-bold tracking-tight'>
          Makers fans are backing
        </h2>
        <Link
          href='#makers'
          className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
        >
          All makers <IconChevronRight className='h-3.5 w-3.5' />
        </Link>
      </div>

      <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-4'>
        {makers.map((maker) => (
          <a
            key={maker.handle}
            href={`#${maker.handle}`}
            className='pill-card flex flex-col gap-2.5 p-3.5 text-left hover:-translate-y-0.5'
          >
            <span
              className='inline-block size-10 shrink-0 rounded-full'
              style={{ backgroundColor: maker.color }}
              aria-hidden='true'
            />
            <div className='min-w-0'>
              <div className='truncate text-sm font-semibold'>{maker.name}</div>
              <div className='truncate font-mono text-[11px] text-muted-foreground'>
                @{maker.handle}
              </div>
            </div>
            <div className='font-display text-lg leading-none font-bold tabular-nums'>
              {formatEtb(maker.backed)}
              <span className='ml-1 font-sans text-xs font-normal text-muted-foreground'>
                backed
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
