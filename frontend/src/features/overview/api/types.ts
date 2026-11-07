export type OverviewTrend = 'up' | 'down' | 'flat';

export type OverviewKpi = {
  label: string;
  value: string;
  delta: string;
  hint: string;
  trend: OverviewTrend;
};

export type OverviewActivityPoint = {
  month: string;
  label: string;
  started: number;
  completed: number;
};

export type OverviewLifecycleKey =
  | 'plan'
  | 'review'
  | 'collect'
  | 'analytics'
  | 'report';

export type OverviewLifecycleStage = {
  key: OverviewLifecycleKey | string;
  label: string;
  count: number;
};

export type OverviewAttentionKind =
  | 'plan_ready'
  | 'draft'
  | 'no_responses'
  | 'ready_for_report'
  | 'stale_report';

export type OverviewAttentionItem = {
  id: string;
  kind: OverviewAttentionKind | string;
  title: string;
  detail: string;
  href: string;
  surveyId: string | null;
};

export type OverviewData = {
  kpis: OverviewKpi[];
  activity: OverviewActivityPoint[];
  surveysTotal: number;
  responsesTotal: number;
  reportsTotal: number;
  completionRate: number;
  lifecycle: OverviewLifecycleStage[];
  attention: OverviewAttentionItem[];
};
