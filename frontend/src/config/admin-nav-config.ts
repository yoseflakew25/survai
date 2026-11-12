import { NavGroup } from '@/types';

export const adminNavGroups: NavGroup[] = [
  {
    label: '',
    items: [
      {
        title: 'Overview',
        url: '/admin/overview',
        icon: 'dashboard',
        isActive: false,
        items: []
      },
      {
        title: 'Organizations',
        url: '/admin/orgs',
        icon: 'workspace',
        isActive: false,
        items: []
      },
      {
        title: 'Users',
        url: '/admin/users',
        icon: 'users',
        isActive: false,
        items: []
      },
      {
        title: 'Activity log',
        url: '/admin/audit',
        icon: 'activity',
        isActive: false,
        items: []
      },
      {
        title: 'AI usage',
        url: '/admin/ai-logs',
        icon: 'sparkles',
        isActive: false,
        items: []
      },
      {
        title: 'System health',
        url: '/admin/health',
        icon: 'settings',
        isActive: false,
        items: []
      }
    ]
  }
];
