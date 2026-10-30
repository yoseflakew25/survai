export type NotificationApiType =
  | 'survey_published'
  | 'survey_closed'
  | 'response_received'
  | 'response_milestone'
  | 'response_digest'
  | 'review_complete'
  | 'report_ready'
  | 'report_failed';

export type NotificationFilterGroup = 'survey' | 'review' | 'report' | 'system';

export type OrgNotification = {
  id: string;
  type: NotificationApiType;
  group: NotificationFilterGroup;
  title: string;
  body: string;
  href: string | null;
  status: 'read' | 'unread';
  createdAt: string;
  meta: Record<string, unknown> | null;
};

export type NotificationList = {
  notifications: OrgNotification[];
  total: number;
  unreadCount: number;
};

export function notificationGroup(type: NotificationApiType): NotificationFilterGroup {
  switch (type) {
    case 'review_complete':
      return 'review';
    case 'report_ready':
    case 'report_failed':
      return 'report';
    case 'survey_published':
    case 'survey_closed':
    case 'response_received':
    case 'response_milestone':
    case 'response_digest':
      return 'survey';
    default:
      return 'system';
  }
}

export function actionLabelFor(type: NotificationApiType): string {
  switch (type) {
    case 'survey_published':
      return 'Open Collect';
    case 'survey_closed':
      return 'View Analytics';
    case 'response_received':
    case 'response_milestone':
    case 'response_digest':
      return 'View Respondents';
    case 'review_complete':
      return 'View Review';
    case 'report_ready':
    case 'report_failed':
      return 'Open Report';
    default:
      return 'Open';
  }
}
