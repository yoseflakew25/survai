'use client';

/**
 * Filters sidebar / command-palette nav by the signed-in user's seat role.
 */

import { useMemo } from 'react';

import { isOrgOwner, useAuth, type UserRole } from '@/lib/auth-context';
import type { NavItem, NavGroup, PermissionCheck } from '@/types';

function canAccess(
  access: PermissionCheck | undefined,
  role: UserRole | undefined
): boolean {
  if (!access) return true;
  if (!role) return false;

  if (access.role === 'organization' || access.role === 'owner') {
    return isOrgOwner(role);
  }

  if (access.role) {
    return role === access.role || role === 'system_admin';
  }

  return true;
}

function filterItems(items: NavItem[], role: UserRole | undefined): NavItem[] {
  return items
    .filter((item) => canAccess(item.access, role))
    .map((item) =>
      item.items?.length
        ? { ...item, items: filterItems(item.items, role) }
        : item
    );
}

/**
 * Hook to filter navigation items by the current user's role.
 */
export function useFilteredNavItems(items: NavItem[]) {
  const { user } = useAuth();
  return useMemo(
    () => filterItems(items, user?.role),
    [items, user?.role]
  );
}

/**
 * Hook to filter navigation groups; drops groups that end up with no items.
 */
export function useFilteredNavGroups(groups: NavGroup[]) {
  const { user } = useAuth();
  return useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: filterItems(group.items, user?.role)
        }))
        .filter((group) => group.items.length > 0),
    [groups, user?.role]
  );
}
