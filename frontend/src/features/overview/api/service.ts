import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import type {
  OverviewActivityPoint,
  OverviewAttentionItem,
  OverviewData,
  OverviewKpi,
  OverviewLifecycleStage,
  OverviewTrend
} from './types';

type ApiKpi = {
  label: string;
  value: string;
  delta: string;
  hint: string;
  trend: string;
};

type ApiActivity = {
  month: string;
  label: string;
  started: number;
  completed: number;
};

type ApiLifecycle = {
  key: string;
  label: string;
  count: number;
};

type ApiAttention = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
  survey_id?: string | null;
};

type ApiOverview = {
  kpis: ApiKpi[];
  activity: ApiActivity[];
  surveys_total: number;
  responses_total: number;
  reports_total: number;
  completion_rate: number;
  lifecycle?: ApiLifecycle[];
  attention?: ApiAttention[];
};

function asTrend(value: string): OverviewTrend {
  if (value === 'up' || value === 'down' || value === 'flat') return value;
  return 'flat';
}

function mapKpi(k: ApiKpi): OverviewKpi {
  return {
    label: k.label,
    value: k.value,
    delta: k.delta,
    hint: k.hint,
    trend: asTrend(k.trend)
  };
}

function mapActivity(p: ApiActivity): OverviewActivityPoint {
  return {
    month: p.month,
    label: p.label,
    started: p.started,
    completed: p.completed
  };
}

function mapLifecycle(s: ApiLifecycle): OverviewLifecycleStage {
  return {
    key: s.key,
    label: s.label,
    count: s.count ?? 0
  };
}

function mapAttention(item: ApiAttention): OverviewAttentionItem {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    detail: item.detail,
    href: item.href,
    surveyId: item.survey_id ?? null
  };
}

export async function getOverview(): Promise<OverviewData> {
  const res = await apiFetch('/overview');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      toUserFacingError(
        new Error(apiErrorMessage(data, 'Could not load overview')),
        'Could not load overview'
      )
    );
  }
  const raw = (await res.json()) as ApiOverview;
  return {
    kpis: (raw.kpis ?? []).map(mapKpi),
    activity: (raw.activity ?? []).map(mapActivity),
    surveysTotal: raw.surveys_total ?? 0,
    responsesTotal: raw.responses_total ?? 0,
    reportsTotal: raw.reports_total ?? 0,
    completionRate: raw.completion_rate ?? 0,
    lifecycle: (raw.lifecycle ?? []).map(mapLifecycle),
    attention: (raw.attention ?? []).map(mapAttention)
  };
}
