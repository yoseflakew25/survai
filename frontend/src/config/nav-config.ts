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
      },
      {
        title: 'Assistant',
        url: '/dashboard/assistant',
        icon: 'chat',
        isActive: false,
        shortcut: ['a', 'a'],
        items: []
      }
    ]
  },
  {
    label: '',
    items: [
      {
        title: 'Account',
        url: '/dashboard/profile',
        icon: 'account',
        isActive: false,
        shortcut: ['m', 'm'],
        items: []
      }
    ]
  }
];
