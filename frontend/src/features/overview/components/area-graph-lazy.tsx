'use client';

import dynamic from 'next/dynamic';
import { AreaGraphSkeleton } from './area-graph-skeleton';

export const AreaGraphLazy = dynamic(
  () => import('./area-graph').then((m) => m.AreaGraph),
  {
    ssr: false,
    loading: () => <AreaGraphSkeleton />
  }
);
