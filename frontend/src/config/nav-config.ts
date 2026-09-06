import { NavGroup } from '@/types';

export const navGroups: NavGroup[] = [
  {
    label: 'Survey Lifecycle',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'Surveys',
        url: '/dashboard/surveys',
        icon: 'survey',
        isActive: false,
        shortcut: ['s', 's'],
        items: []
      }
    ]
  },
  {
    label: '',
    items: [
      {
        title: 'Account',
        url: '#',
        icon: 'account',
        isActive: true,
        items: [
          {
            title: 'Profile',
            url: '/dashboard/profile',
            icon: 'profile',
            shortcut: ['m', 'm']
          },
          {
            title: 'Settings',
            url: '/dashboard/settings',
            icon: 'settings',
            shortcut: ['t', 't']
          },
          {
            title: 'Notifications',
            url: '/dashboard/notifications',
            icon: 'notification',
            shortcut: ['n', 'n']
          }
        ]
      }
    ]
  }
];
