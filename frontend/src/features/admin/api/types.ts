export type AdminOverviewKpi = {
  key: string;
  label: string;
  value: string;
  hint?: string | null;
  delta?: string | null;
  trend?: 'up' | 'down' | 'flat';
  href?: string | null;
};

export type AdminOverviewSeriesPoint = {
  date: string;
  label: string;
  responses_started: number;
  responses_completed: number;
  ai_calls: number;
  ai_errors: number;
  signups: number;
};

export type AdminOverviewBreakdownItem = {
  key: string;
  label: string;
  count: number;
};

export type AdminOverviewAlert = {
  id: string;
  severity: 'info' | 'warning' | 'critical' | string;
  title: string;
  detail: string;
  href: string;
};

export type AdminOverviewGeoCountry = {
  code: string;
  name: string;
  count: number;
  lat: number;
  lng: number;
  numeric_id?: number | null;
};

export type AdminOverviewGeoPresence = {
  countries: AdminOverviewGeoCountry[];
  users_located: number;
  users_unknown: number;
};

export type AdminOverviewOrgSnippet = {
  id: string;
  name: string;
  is_active: boolean;
  member_count: number;
  survey_count: number;
  created_at: string;
};

export type AdminOverview = {
  generated_at: string;
  kpis: AdminOverviewKpi[];
  orgs_total: number;
  orgs_active: number;
  orgs_suspended: number;
  users_total: number;
  users_active: number;
  users_inactive: number;
  users_7d: number;
  users_prev_7d: number;
  surveys_total: number;
  surveys_draft: number;
  surveys_published: number;
  surveys_closed: number;
  surveys_archived: number;
  responses_7d: number;
  responses_30d: number;
  responses_prev_7d: number;
  responses_started_7d: number;
  completion_rate_7d: number;
  ai_calls_7d: number;
  ai_calls_prev_7d: number;
  ai_calls_30d: number;
  ai_errors_7d: number;
  ai_error_rate_7d: number;
  ai_tokens_7d: number;
  ai_avg_latency_ms_7d: number | null;
  series_30d: AdminOverviewSeriesPoint[];
  survey_status: AdminOverviewBreakdownItem[];
  user_roles: AdminOverviewBreakdownItem[];
  ai_by_feature_7d: AdminOverviewBreakdownItem[];
  alerts: AdminOverviewAlert[];
  recent_orgs: AdminOverviewOrgSnippet[];
  recent_audit: AdminAuditItem[];
  recent_ai_failures: AdminAiLogItem[];
  geo_presence: AdminOverviewGeoPresence;
  health: AdminHealth | null;
};

export type AdminOrg = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  is_active: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  feature_flags: Record<string, boolean>;
  notes: string | null;
  member_count: number;
  survey_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminOrgList = {
  organizations: AdminOrg[];
  total: number;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'system_admin' | 'organization' | 'researcher' | 'viewer';
  is_active: boolean;
  is_superuser: boolean;
  email_verified: boolean;
  organization_id: string | null;
  organization_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUserList = {
  users: AdminUser[];
  total: number;
};

export type AdminAuditItem = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  organization_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
};

export type AdminAuditList = {
  items: AdminAuditItem[];
  total: number;
};

export type AdminAiLogItem = {
  id: string;
  feature: string;
  user_id: string | null;
  user_email: string | null;
  model: string;
  status: string;
  tokens_input: number | null;
  tokens_output: number | null;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
};

export type AdminAiLogList = {
  items: AdminAiLogItem[];
  total: number;
  error_rate: number;
};

export type AdminOrgInspect = {
  organization: AdminOrg;
  members: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
  }[];
  surveys: {
    id: string;
    title: string;
    status: string;
    response_count: number;
    updated_at: string;
  }[];
  recent_audit: AdminAuditItem[];
};

export type AdminHealth = {
  status: string;
  jobs_mode: string;
  redis_configured: boolean;
  environment: string;
};

export type AdminImpersonateResult = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AdminUser;
  organization_id: string;
  organization_name: string;
  impersonator_id: string;
};
