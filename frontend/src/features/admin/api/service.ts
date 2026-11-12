import { apiErrorMessage, apiFetch } from '@/lib/api';
import type {
  AdminAiLogList,
  AdminAuditList,
  AdminHealth,
  AdminImpersonateResult,
  AdminOrg,
  AdminOrgInspect,
  AdminOrgList,
  AdminOverview,
  AdminUser,
  AdminUserList
} from './types';

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let detail = fallback;
    try {
      detail = apiErrorMessage(await res.json(), fallback);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await apiFetch('/admin/overview');
  return readJson(res, 'Could not load admin overview');
}

export async function fetchAdminOrgs(params?: {
  search?: string;
  active?: boolean;
  skip?: number;
  limit?: number;
}): Promise<AdminOrgList> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.active !== undefined) qs.set('active', String(params.active));
  if (params?.skip != null) qs.set('skip', String(params.skip));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const res = await apiFetch(`/admin/orgs?${qs}`);
  return readJson(res, 'Could not load organizations');
}

export async function fetchAdminOrg(orgId: string): Promise<AdminOrg> {
  const res = await apiFetch(`/admin/orgs/${orgId}`);
  return readJson(res, 'Organization not found');
}

export async function patchAdminOrg(
  orgId: string,
  body: {
    name?: string;
    notes?: string | null;
    is_active?: boolean;
    suspended_reason?: string | null;
  }
): Promise<AdminOrg> {
  const res = await apiFetch(`/admin/orgs/${orgId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return readJson(res, 'Could not update organization');
}

export async function patchOrgFeatureFlags(
  orgId: string,
  flags: Record<string, boolean>
): Promise<{ organization_id: string; flags: Record<string, boolean> }> {
  const res = await apiFetch(`/admin/orgs/${orgId}/feature-flags`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flags })
  });
  return readJson(res, 'Could not update feature flags');
}

export async function fetchOrgInspect(orgId: string): Promise<AdminOrgInspect> {
  const res = await apiFetch(`/admin/orgs/${orgId}/inspect`);
  return readJson(res, 'Could not inspect organization');
}

export async function startImpersonation(
  orgId: string
): Promise<AdminImpersonateResult> {
  const res = await apiFetch(`/admin/orgs/${orgId}/impersonate`, {
    method: 'POST'
  });
  return readJson(res, 'Could not start impersonation');
}

export async function stopImpersonation(): Promise<{
  access_token: string;
  refresh_token: string;
  user: AdminUser;
}> {
  const res = await apiFetch('/admin/impersonate/stop', { method: 'POST' });
  return readJson(res, 'Could not stop impersonation');
}

export async function fetchAdminUsers(params?: {
  search?: string;
  role?: string;
  organization_id?: string;
  skip?: number;
  limit?: number;
}): Promise<AdminUserList> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.role) qs.set('role', params.role);
  if (params?.organization_id) qs.set('organization_id', params.organization_id);
  if (params?.skip != null) qs.set('skip', String(params.skip));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const res = await apiFetch(`/admin/users?${qs}`);
  return readJson(res, 'Could not load users');
}

export async function createAdminUser(body: {
  email: string;
  full_name: string;
  password: string;
  role?: string;
  organization_id?: string | null;
  organization_name?: string | null;
  is_superuser?: boolean;
  email_verified?: boolean;
}): Promise<AdminUser> {
  const res = await apiFetch('/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return readJson(res, 'Could not create user');
}

export async function patchAdminUser(
  userId: string,
  body: {
    full_name?: string;
    role?: string;
    is_active?: boolean;
    is_superuser?: boolean;
    email_verified?: boolean;
    organization_id?: string | null;
    password?: string;
  }
): Promise<AdminUser> {
  const res = await apiFetch(`/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return readJson(res, 'Could not update user');
}

export async function fetchAuditLog(params?: {
  organization_id?: string;
  action?: string;
  skip?: number;
  limit?: number;
}): Promise<AdminAuditList> {
  const qs = new URLSearchParams();
  if (params?.organization_id) qs.set('organization_id', params.organization_id);
  if (params?.action) qs.set('action', params.action);
  if (params?.skip != null) qs.set('skip', String(params.skip));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const res = await apiFetch(`/admin/audit-log?${qs}`);
  return readJson(res, 'Could not load audit log');
}

export async function fetchAiLogs(params?: {
  feature?: string;
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<AdminAiLogList> {
  const qs = new URLSearchParams();
  if (params?.feature) qs.set('feature', params.feature);
  if (params?.status) qs.set('status', params.status);
  if (params?.skip != null) qs.set('skip', String(params.skip));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const res = await apiFetch(`/admin/ai-logs?${qs}`);
  return readJson(res, 'Could not load AI logs');
}

export async function fetchAdminHealth(): Promise<AdminHealth> {
  const res = await apiFetch('/admin/health');
  return readJson(res, 'Could not load health');
}
