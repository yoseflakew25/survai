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

export type OverviewData = {
  kpis: OverviewKpi[];
  activity: OverviewActivityPoint[];
  surveysTotal: number;
  responsesTotal: number;
  reportsTotal: number;
  completionRate: number;
};
