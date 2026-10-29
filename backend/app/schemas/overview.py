"""Organization dashboard overview — KPIs + response activity series."""

from __future__ import annotations

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


class OverviewResponse(BaseModel):
    kpis: list[OverviewKpi]
    activity: list[OverviewActivityPoint]
    surveys_total: int
    responses_total: int
    reports_total: int
    completion_rate: float
