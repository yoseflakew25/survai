'use client';

import {
  IconChevronUp,
  IconPlus
} from '@/features/board/components/launchpot-mark';
import { BoardProduct, formatEtb } from '@/features/board/data';

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className='grid size-7 shrink-0 place-items-center rounded-full bg-gold font-mono text-xs font-medium text-[#111210] shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]'>
        1
      </span>
    );
  }
  return (
    <span className='grid size-7 shrink-0 place-items-center rounded-full bg-foreground font-mono text-xs font-medium text-background'>
      {rank}
    </span>
  );
}

function ProductLogo({ product }: { product: BoardProduct }) {
  return (
    <div
      className='grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-bold tracking-tight text-white'
      style={{ backgroundColor: product.logoColor }}
      aria-hidden='true'
    >
      {product.logoInitials}
    </div>
  );
}

function MakerAvatar({ product }: { product: BoardProduct }) {
  return (
    <span
      className='inline-block size-4 shrink-0 rounded-full'
      style={{ backgroundColor: product.makerColor }}
      aria-hidden='true'
    />
  );
}

function BoardRow({ product, delayMs }: { product: BoardProduct; delayMs: number }) {
  return (
    <a
      href={`#${product.id}`}
      className={`board-row group flex items-center gap-3 px-3 py-3 sm:gap-3.5 sm:px-4${product.rank === 1 ? ' bg-brand-soft/60' : ''}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <RankBadge rank={product.rank} />
      <ProductLogo product={product} />

      <div className='min-w-0 flex-1'>
        <h3 className='font-display truncate text-base leading-snug font-semibold tracking-tight'>
          {product.name}
        </h3>
        <p className='truncate text-sm text-muted-foreground'>{product.description}</p>
        <p className='mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground'>
          <MakerAvatar product={product} />
          <span className='truncate'>{product.maker}</span>
          <span className='hidden truncate sm:inline'>· {product.category}</span>
        </p>
      </div>

      <button
        type='button'
        title='Back this product'
        className='group/back relative h-12 min-w-[4.75rem] shrink-0 rounded-xl border border-border bg-card px-2.5 text-right transition-colors hover:border-transparent hover:bg-brand hover:text-brand-foreground'
        onClick={(e) => e.preventDefault()}
      >
        <span className='block group-hover/back:invisible'>
          <span className='font-display block text-[17px] leading-tight font-bold tabular-nums'>
            {formatEtb(product.amount)}
          </span>
          <span className='block font-mono text-[11px] leading-tight text-muted-foreground'>
            {product.backers} {product.backers === 1 ? 'backer' : 'backers'}
          </span>
        </span>
        <span className='absolute inset-0 hidden items-center justify-center gap-1 text-sm font-semibold group-hover/back:flex'>
          <IconPlus className='h-3.5 w-3.5' /> Back
        </span>
      </button>

      <button
        type='button'
        title='Upvote'
        className='flex h-12 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-card px-1.5 transition-colors hover:border-foreground/40'
        onClick={(e) => e.preventDefault()}
      >
        <IconChevronUp className='h-[18px] w-[18px]' />
        <span className='font-mono text-[11px] leading-none font-medium tabular-nums'>
          {product.upvotes}
        </span>
      </button>
    </a>
  );
}

export function BoardList({ products }: { products: BoardProduct[] }) {
  return (
    <div className='board'>
      {products.map((product, i) => (
        <BoardRow key={product.id} product={product} delayMs={(i + 1) * 30} />
      ))}
    </div>
  );
}
