import { NavGroup } from '@/types';

/** `title` / `label` values are next-intl keys under the `nav` namespace. */
export const navGroups: NavGroup[] = [
  {
    label: 'surveyLifecycle',
    items: [
      {
        title: 'dashboard',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'surveys',
        url: '/dashboard/surveys',
        icon: 'survey',
        isActive: false,
        shortcut: ['s', 's'],
        items: []
      },
      {
        title: 'assistant',
        url: '/dashboard/assistant',
        icon: 'chat',
        isActive: false,
        shortcut: ['a', 'a'],
        items: []
      }
    ]
  },
  {
    label: 'settings',
    items: [
      {
        title: 'account',
        url: '/dashboard/profile',
        icon: 'account',
        isActive: false,
        shortcut: ['m', 'm'],
        items: [],
        // Org Owner (and platform admin) only.
        access: { role: 'organization' }
      },
      {
        title: 'security',
        url: '/dashboard/security',
        icon: 'lock',
        isActive: false,
        shortcut: ['k', 'k'],
        items: []
        // All seats — researchers/viewers change password here.
      }
    ]
  }
];
