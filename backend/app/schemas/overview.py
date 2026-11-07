"""Organization dashboard overview — KPIs + response activity series."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class OverviewKpi(BaseModel):
    label: str
    value: str
    delta: str
    hint: str
    trend: str = Field(description="up | down | flat")


class OverviewActivityPoint(BaseModel):
    month: str  # e.g. "2026-01"
    label: str  # e.g. "Jan"
    started: int
    completed: int


class OverviewLifecycleStage(BaseModel):
    key: str = Field(description="plan | review | collect | analytics | report")
    label: str
    count: int


class OverviewAttentionItem(BaseModel):
    id: str
    kind: str = Field(
        description="plan_ready | draft | no_responses | ready_for_report | stale_report"
    )
    title: str
    detail: str
    href: str
    survey_id: UUID | None = None


class OverviewResponse(BaseModel):
    kpis: list[OverviewKpi]
    activity: list[OverviewActivityPoint]
    surveys_total: int
    responses_total: int
    reports_total: int
    completion_rate: float
    lifecycle: list[OverviewLifecycleStage] = Field(default_factory=list)
    attention: list[OverviewAttentionItem] = Field(default_factory=list)
