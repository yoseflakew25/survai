"""Schemas for the system-admin platform console."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole
from app.schemas.user import UserPublic


class AdminOverviewKpi(BaseModel):
    key: str
    label: str
    value: str
    hint: str | None = None
    delta: str | None = None
    trend: str = Field(default="flat", description="up | down | flat")
    href: str | None = None


class AdminOverviewSeriesPoint(BaseModel):
    date: str  # YYYY-MM-DD
    label: str
    responses_started: int = 0
    responses_completed: int = 0
    ai_calls: int = 0
    ai_errors: int = 0
    signups: int = 0


class AdminOverviewBreakdownItem(BaseModel):
    key: str
    label: str
    count: int


class AdminOverviewAlert(BaseModel):
    id: str
    severity: str = Field(description="info | warning | critical")
    title: str
    detail: str
    href: str


class AdminOverviewOrgSnippet(BaseModel):
    id: UUID
    name: str
    is_active: bool
    member_count: int
    survey_count: int
    created_at: datetime


class AdminOverviewGeoCountry(BaseModel):
    code: str
    name: str
    count: int
    lat: float
    lng: float
    numeric_id: int | None = None


class AdminOverviewGeoPresence(BaseModel):
    countries: list[AdminOverviewGeoCountry] = Field(default_factory=list)
    users_located: int = 0
    users_unknown: int = 0


class AdminOrgPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    website: str | None = None
    is_active: bool
    suspended_at: datetime | None = None
    suspended_reason: str | None = None
    feature_flags: dict[str, bool]
    notes: str | None = None
    member_count: int = 0
    survey_count: int = 0
    created_at: datetime
    updated_at: datetime


class AdminOrgListResponse(BaseModel):
    organizations: list[AdminOrgPublic]
    total: int


class AdminOrgUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    notes: str | None = None
    is_active: bool | None = None
    suspended_reason: str | None = None


class AdminFeatureFlagsUpdate(BaseModel):
    flags: dict[str, bool]


class AdminFeatureFlagsResponse(BaseModel):
    organization_id: UUID
    flags: dict[str, bool]


class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.organization
    organization_id: UUID | None = None
    organization_name: str | None = Field(default=None, min_length=1, max_length=255)
    # Promoting to system_admin requires explicit confirm on the client; still allowed.
    is_superuser: bool = False
    email_verified: bool = True


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    email_verified: bool | None = None
    organization_id: UUID | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class AdminUserListResponse(BaseModel):
    users: list[UserPublic]
    total: int


class AdminAuditItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_user_id: UUID | None
    actor_email: str | None = None
    action: str
    resource_type: str
    resource_id: UUID | None
    organization_id: UUID | None
    metadata: dict[str, Any] | None = None
    ip: str | None = None
    created_at: datetime


class AdminAuditListResponse(BaseModel):
    items: list[AdminAuditItem]
    total: int


class AdminAiLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    feature: str
    user_id: UUID | None
    user_email: str | None = None
    model: str
    status: str
    tokens_input: int | None = None
    tokens_output: int | None = None
    latency_ms: int | None = None
    error_message: str | None = None
    created_at: datetime


class AdminAiLogListResponse(BaseModel):
    items: list[AdminAiLogItem]
    total: int
    error_rate: float


class AdminInspectMember(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool


class AdminInspectSurvey(BaseModel):
    id: UUID
    title: str
    status: str
    response_count: int
    updated_at: datetime


class AdminOrgInspectResponse(BaseModel):
    organization: AdminOrgPublic
    members: list[AdminInspectMember]
    surveys: list[AdminInspectSurvey]
    recent_audit: list[AdminAuditItem]


class AdminImpersonateResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic
    organization_id: UUID
    organization_name: str
    impersonator_id: UUID


class AdminHealthResponse(BaseModel):
    status: str
    jobs_mode: str
    redis_configured: bool
    environment: str


class AdminOverviewResponse(BaseModel):
    generated_at: datetime
    kpis: list[AdminOverviewKpi]
    orgs_total: int
    orgs_active: int
    orgs_suspended: int
    users_total: int
    users_active: int = 0
    users_inactive: int = 0
    users_7d: int = 0
    users_prev_7d: int = 0
    surveys_total: int
    surveys_draft: int = 0
    surveys_published: int = 0
    surveys_closed: int = 0
    surveys_archived: int = 0
    responses_7d: int
    responses_30d: int
    responses_prev_7d: int = 0
    responses_started_7d: int = 0
    completion_rate_7d: float = 0.0
    ai_calls_7d: int
    ai_calls_prev_7d: int = 0
    ai_calls_30d: int = 0
    ai_errors_7d: int = 0
    ai_error_rate_7d: float
    ai_tokens_7d: int = 0
    ai_avg_latency_ms_7d: float | None = None
    series_30d: list[AdminOverviewSeriesPoint] = Field(default_factory=list)
    survey_status: list[AdminOverviewBreakdownItem] = Field(default_factory=list)
    user_roles: list[AdminOverviewBreakdownItem] = Field(default_factory=list)
    ai_by_feature_7d: list[AdminOverviewBreakdownItem] = Field(default_factory=list)
    alerts: list[AdminOverviewAlert] = Field(default_factory=list)
    recent_orgs: list[AdminOverviewOrgSnippet] = Field(default_factory=list)
    recent_audit: list[AdminAuditItem] = Field(default_factory=list)
    recent_ai_failures: list[AdminAiLogItem] = Field(default_factory=list)
    geo_presence: AdminOverviewGeoPresence = Field(
        default_factory=AdminOverviewGeoPresence
    )
    health: AdminHealthResponse | None = None
