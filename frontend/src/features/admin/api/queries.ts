import { queryOptions } from '@tanstack/react-query';

import {
  fetchAdminHealth,
  fetchAdminOrgs,
  fetchAdminOverview,
  fetchAdminUsers,
  fetchAiLogs,
  fetchAuditLog,
  fetchOrgInspect
} from './service';

export const adminKeys = {
  all: ['admin'] as const,
  overview: () => [...adminKeys.all, 'overview'] as const,
  orgs: (params?: object) => [...adminKeys.all, 'orgs', params ?? {}] as const,
  orgInspect: (id: string) => [...adminKeys.all, 'org-inspect', id] as const,
  users: (params?: object) => [...adminKeys.all, 'users', params ?? {}] as const,
  audit: (params?: object) => [...adminKeys.all, 'audit', params ?? {}] as const,
  aiLogs: (params?: object) => [...adminKeys.all, 'ai-logs', params ?? {}] as const,
  health: () => [...adminKeys.all, 'health'] as const
};

export function adminOverviewQueryOptions() {
  return queryOptions({
    queryKey: adminKeys.overview(),
    queryFn: fetchAdminOverview,
    staleTime: 30_000,
    // Aiven round-trips can be slow; don't flap the skeleton forever on refetch.
    refetchOnWindowFocus: false
  });
}

export function adminOrgsQueryOptions(params?: {
  search?: string;
  active?: boolean;
  skip?: number;
  limit?: number;
}) {
  return queryOptions({
    queryKey: adminKeys.orgs(params),
    queryFn: () => fetchAdminOrgs(params),
    staleTime: 20_000
  });
}

export function adminOrgInspectQueryOptions(orgId: string) {
  return queryOptions({
    queryKey: adminKeys.orgInspect(orgId),
    queryFn: () => fetchOrgInspect(orgId),
    staleTime: 15_000
  });
}

export function adminUsersQueryOptions(params?: {
  search?: string;
  role?: string;
  skip?: number;
  limit?: number;
}) {
  return queryOptions({
    queryKey: adminKeys.users(params),
    queryFn: () => fetchAdminUsers(params),
    staleTime: 20_000
  });
}

export function adminAuditQueryOptions(params?: {
  organization_id?: string;
  action?: string;
  skip?: number;
  limit?: number;
}) {
  return queryOptions({
    queryKey: adminKeys.audit(params),
    queryFn: () => fetchAuditLog(params),
    staleTime: 15_000
  });
}

export function adminAiLogsQueryOptions(params?: {
  feature?: string;
  status?: string;
  skip?: number;
  limit?: number;
}) {
  return queryOptions({
    queryKey: adminKeys.aiLogs(params),
    queryFn: () => fetchAiLogs(params),
    staleTime: 15_000
  });
}

export function adminHealthQueryOptions() {
  return queryOptions({
    queryKey: adminKeys.health(),
    queryFn: fetchAdminHealth,
    staleTime: 10_000
  });
}
