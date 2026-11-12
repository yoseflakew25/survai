/**
 * User data access — platform admin endpoints under /admin/users.
 * Prefer the admin users UI at /admin/users; this module remains for any
 * leftover imports from the old dashboard users table.
 */

import {
  createAdminUser,
  fetchAdminUsers,
  patchAdminUser
} from '@/features/admin/api/service';
import type { UserFilters, UsersResponse, UserMutationPayload } from './types';

export async function getUsers(filters: UserFilters): Promise<UsersResponse> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const skip = Math.max(0, (page - 1) * limit);
  const data = await fetchAdminUsers({
    search: filters.search,
    role: Array.isArray(filters.roles) ? filters.roles[0] : filters.roles,
    skip,
    limit
  });
  return {
    success: true,
    time: new Date().toISOString(),
    message: 'ok',
    total_users: data.total,
    offset: skip,
    limit,
    users: data.users.map((u, index) => {
      const parts = u.full_name.trim().split(/\s+/);
      const first_name = parts[0] ?? '';
      const last_name = parts.slice(1).join(' ') || first_name;
      return {
        id: index + 1,
        first_name,
        last_name,
        email: u.email,
        phone: '',
        role: u.role,
        status: u.is_active ? 'active' : 'inactive',
        created_at: u.created_at,
        updated_at: u.updated_at
      };
    })
  };
}

export async function createUser(data: UserMutationPayload) {
  const fullName =
    `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email;
  const created = await createAdminUser({
    email: data.email,
    full_name: fullName,
    password: 'ChangeMe123',
    role: data.role,
    email_verified: true
  });
  return { success: true, user: created };
}

export async function updateUser(id: number | string, data: UserMutationPayload) {
  // Legacy table used numeric ids; admin UI uses UUID strings via /admin/users.
  if (typeof id === 'string' && id.includes('-')) {
    const fullName =
      `${data.first_name || ''} ${data.last_name || ''}`.trim() || undefined;
    return patchAdminUser(id, {
      full_name: fullName,
      role: data.role,
      is_active: data.status !== 'inactive'
    });
  }
  throw new Error('Use /admin/users to manage accounts');
}

export async function deleteUser(_id: number) {
  throw new Error('Deactivate users from /admin/users instead of deleting');
}
