'use client';

/**
 * Client-side hook for filtering navigation items.
 *
 * With Clerk removed, this now passes through all items without RBAC filtering.
 * Re-add filtering logic when integrating a real auth provider.
 */

import { useMemo } from 'react';
import type { NavItem, NavGroup } from '@/types';

/**
 * Hook to filter navigation items (currently no-op, shows all items)
 *
 * @param items - Array of navigation items
 * @returns All items (unfiltered)
 */
export function useFilteredNavItems(items: NavItem[]) {
  return useMemo(() => items, [items]);
}

/**
 * Hook to filter navigation groups (currently no-op, shows all groups)
 *
 * @param groups - Array of navigation groups
 * @returns All groups (unfiltered)
 */
export function useFilteredNavGroups(groups: NavGroup[]) {
  return useMemo(() => groups, [groups]);
}
