import { queryOptions } from '@tanstack/react-query';
import { getOverview } from './service';

export const overviewKeys = {
  all: ['overview'] as const,
  detail: () => [...overviewKeys.all, 'detail'] as const
};

export const overviewQueryOptions = () =>
  queryOptions({
    queryKey: overviewKeys.detail(),
    queryFn: getOverview,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
