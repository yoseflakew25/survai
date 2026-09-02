import { create } from 'zustand';
import type { NotificationStatus, NotificationAction } from '@/components/ui/notification-card';

export type Notification = {
  id: string;
  title: string;
  body: string;
  status: NotificationStatus;
  createdAt: string;
  type: 'survey' | 'review' | 'report' | 'team' | 'system';
  actions?: NotificationAction[];
};

type NotificationState = {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'status'>) => void;
  unreadCount: () => number;
};

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'AI Review complete for Community Health Assessment',
    body: 'The AI reviewer found 3 suggestions for improving question wording in Section 2. Review the findings before publishing.',
    status: 'unread',
    type: 'review',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    actions: [
      {
        id: 'view',
        label: 'View Review',
        type: 'redirect',
        style: 'primary'
      }
    ]
  },
  {
    id: '2',
    title: 'New responses received for Maternal & Child Health Survey',
    body: '12 new responses were submitted in the last hour. Total responses: 203. Completion rate: 85.7%.',
    status: 'unread',
    type: 'survey',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    actions: [
      {
        id: 'view',
        label: 'View Analytics',
        type: 'redirect',
        style: 'primary'
      }
    ]
  },
  {
    id: '3',
    title: 'Report generated for Water & Sanitation Baseline',
    body: 'The AI-generated report for Water & Sanitation Baseline is ready. 8 sections covering all objectives.',
    status: 'unread',
    type: 'report',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    actions: [
      {
        id: 'view',
        label: 'Open Report',
        type: 'redirect',
        style: 'primary'
      }
    ]
  },
  {
    id: '4',
    title: 'Dr. Sarah Chen edited Education Program Evaluation',
    body: 'Sarah added 3 new questions to Section 1: Demographics. Last edited 2 hours ago.',
    status: 'read',
    type: 'team',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    actions: [
      {
        id: 'view',
        label: 'Open Survey',
        type: 'redirect',
        style: 'default'
      }
    ]
  },
  {
    id: '5',
    title: 'Survey "Youth Employment Needs" was published',
    body: 'Your survey is now live. Share the collection link or QR code to start collecting responses.',
    status: 'read',
    type: 'survey',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    actions: [
      {
        id: 'view',
        label: 'View Survey',
        type: 'redirect',
        style: 'primary'
      }
    ]
  },
  {
    id: '6',
    title: 'AI-generated plan approved for Food Security Assessment',
    body: 'The plan was reviewed and approved. 4 objectives, 26 questions across 5 sections. Ready to build.',
    status: 'read',
    type: 'review',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    actions: [
      {
        id: 'view',
        label: 'Start Building',
        type: 'redirect',
        style: 'primary'
      }
    ]
  },
  {
    id: '7',
    title: 'Livelihoods Impact Survey collection closed',
    body: 'Collection was automatically closed after reaching 67 responses over 14 days. Average completion time: 9.3 min.',
    status: 'read',
    type: 'system',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    actions: [
      {
        id: 'view',
        label: 'View Results',
        type: 'redirect',
        style: 'default'
      }
    ]
  },
  {
    id: '8',
    title: 'Dr. James Mwangi joined the organization',
    body: 'James has been added as a Researcher. He can now create and edit surveys.',
    status: 'read',
    type: 'team',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
  }
];

export const useNotificationStore = create<NotificationState>()(
  (set, get) => ({
    notifications: mockNotifications,

    markAsRead: (id) =>
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, status: 'read' as const } : n
        )
      })),

    markAllAsRead: () =>
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          status: 'read' as const
        }))
      })),

    removeNotification: (id) =>
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      })),

    addNotification: (notification) =>
      set((state) => ({
        notifications: [{ ...notification, status: 'unread' as const }, ...state.notifications]
      })),

    unreadCount: () => get().notifications.filter((n) => n.status === 'unread').length
  })
);
