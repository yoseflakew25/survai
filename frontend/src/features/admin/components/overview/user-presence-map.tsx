'use client';

import { useMemo, useState } from 'react';
import world from '@svg-maps/world';

import type { AdminOverviewGeoPresence } from '@/features/admin/api/types';
import { cn } from '@/lib/utils';

/**
 * Crop @svg-maps/world (viewBox 0 0 1010 666): drop Arctic / Greenland headroom,
 * keep Australia and southern continents. Smaller box = larger countries on screen.
 */
const VIEW_BOX = '12 128 986 488';

type UserPresenceMapProps = {
  geo: AdminOverviewGeoPresence;
};

/** Country choropleth — highlight where users sign in from. */
export function UserPresenceMap({ geo }: UserPresenceMapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const byCode = useMemo(() => {
    const map = new Map<string, { name: string; count: number; code: string }>();
    for (const c of geo.countries) {
      map.set(c.code.toLowerCase(), {
        code: c.code,
        name: c.name,
        count: c.count
      });
    }
    return map;
  }, [geo.countries]);

  const max = Math.max(1, ...geo.countries.map((c) => c.count));
  const active = activeId ? byCode.get(activeId) : null;

  if (geo.countries.length === 0) {
    return (
      <div className='flex min-h-[320px] flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-3 text-center'>
        <p className='text-sm text-muted-foreground'>
          Countries light up when users sign in.
        </p>
      </div>
    );
  }

  return (
    <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card'>
      <div className='relative min-h-[320px] flex-1'>
        <svg
          viewBox={VIEW_BOX}
          preserveAspectRatio='xMidYMid slice'
          className='absolute inset-0 size-full'
          role='img'
          aria-label='Countries with active Survai users'
        >
        {world.locations.map((loc: (typeof world.locations)[number]) => {
          const hit = byCode.get(loc.id);
          const isActive = activeId === loc.id;
          const intensity = hit ? 0.55 + (hit.count / max) * 0.45 : 0;

          return (
            <path
              key={loc.id}
              d={loc.path}
              data-country={loc.id}
              className={cn(
                'transition-[fill,stroke-width] duration-150',
                hit && 'cursor-pointer'
              )}
              style={{
                fill: hit
                  ? `color-mix(in srgb, var(--brand) ${Math.round(intensity * 100)}%, var(--brand-soft))`
                  : 'var(--card)',
                stroke: hit
                  ? 'color-mix(in srgb, var(--brand-strong) 55%, var(--foreground))'
                  : 'color-mix(in srgb, var(--foreground) 28%, var(--border))',
                strokeWidth: isActive ? 2.25 : hit ? 1.65 : 1.35,
                strokeLinejoin: 'round'
              }}
              onMouseEnter={() => {
                if (hit) setActiveId(loc.id);
              }}
              onMouseLeave={() => setActiveId(null)}
            >
              <title>
                {hit
                  ? `${hit.name}: ${hit.count} user${hit.count === 1 ? '' : 's'}`
                  : loc.name}
              </title>
            </path>
          );
        })}
        </svg>
      </div>

      <div className='flex shrink-0 items-center justify-between gap-2 border-t border-border bg-brand-soft/40 px-2 py-1'>
        <p className='text-[11px] text-muted-foreground'>
          Highlighted = users signed in from that country
        </p>
        <p
          className={cn(
            'font-mono text-[11px] font-semibold text-foreground transition-opacity',
            active ? 'opacity-100' : 'opacity-40'
          )}
        >
          {active ? `${active.name} · ${active.count}` : 'Hover a country'}
        </p>
      </div>
    </div>
  );
}
