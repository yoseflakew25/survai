import { queryOptions } from '@tanstack/react-query';
import { getPlans, getPlanById } from './service';

// ============================================================
// Query Key Factories
// ============================================================

export const planKeys = {
  all: ['plans'] as const,
  list: () => [...planKeys.all, 'list'] as const,
  detail: (id: string) => [...planKeys.all, 'detail', id] as const
};

// ============================================================
// Query Options — shared between server prefetch and client hooks
// ============================================================

export const plansQueryOptions = () =>
  queryOptions({
    queryKey: planKeys.list(),
    queryFn: () => getPlans()
  });

export const planByIdOptions = (id: string) =>
  queryOptions({
    queryKey: planKeys.detail(id),
    queryFn: () => getPlanById(id),
    enabled: !!id
  });
