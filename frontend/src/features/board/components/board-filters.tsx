'use client';

import { CATEGORIES, KIND_OPTIONS, SORT_OPTIONS } from '@/features/board/data';

type BoardFiltersProps = {
  sort: string;
  kind: string;
  category: string;
  onSortChange: (id: string) => void;
  onKindChange: (id: string) => void;
  onCategoryChange: (id: string) => void;
};

function Segmented({
  options,
  value,
  onChange
}: {
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className='inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-secondary p-[3px]'>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type='button'
            onClick={() => onChange(opt.id)}
            className={
              active
                ? 'h-8 rounded-full bg-card px-3.5 text-[13px] font-medium leading-8 whitespace-nowrap text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-colors'
                : 'h-8 rounded-full px-3.5 text-[13px] font-medium leading-8 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground'
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function BoardFilters({
  sort,
  kind,
  category,
  onSortChange,
  onKindChange,
  onCategoryChange
}: BoardFiltersProps) {
  return (
    <>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
        <Segmented options={SORT_OPTIONS} value={sort} onChange={onSortChange} />
        <Segmented options={KIND_OPTIONS} value={kind} onChange={onKindChange} />
      </div>

      <div
        id='categories'
        className='mb-4 flex gap-1.5 overflow-x-auto pr-10 pb-1 [mask-image:linear-gradient(to_right,black_88%,transparent)] [scrollbar-width:none]'
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              type='button'
              onClick={() => onCategoryChange(cat)}
              className={
                active
                  ? 'h-8 shrink-0 rounded-full border border-foreground bg-foreground px-3 text-[13px] leading-[30px] text-background'
                  : 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] hover:border-foreground/40'
              }
            >
              {cat}
            </button>
          );
        })}
      </div>
    </>
  );
}
