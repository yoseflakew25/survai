"""Analytics API schemas — snake_case JSON matching FE camelCase maps."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class MetricValuePublic(BaseModel):
    key: str
    label: str
    value: float | int | str
    unit: Literal["count", "percent", "mean", "median", "text"]


class AnalyticsSummaryPublic(BaseModel):
    survey_id: UUID
    survey_version_id: UUID
    response_count: int
    completion_rate: float
    avg_completion_minutes: float | None = None
    metrics: list[MetricValuePublic] = Field(default_factory=list)
    denominator_notes: str = (
        "completion_rate = completed / started respondents for this version; "
        "distribution percents use valid (non-missing) answers as denominator"
    )


class DistributionBucketPublic(BaseModel):
    label: str
    value: int
    percent: float


class QuestionDistributionPublic(BaseModel):
    question_id: UUID
    question_text: str
    question_type: str
    total_responses: int
    missing_count: int
    buckets: list[DistributionBucketPublic]
    denominator: str = "valid_responses"


class AnalyticsFilter(BaseModel):
    question_id: UUID
    op: Literal["eq", "in", "gt", "lt", "between"]
    value: Any


class AnalyticsQueryRequest(BaseModel):
    question_ids: list[UUID] | None = None
    filters: list[AnalyticsFilter] = Field(default_factory=list)


class AnalyticsQueryResponse(BaseModel):
    survey_id: UUID
    survey_version_id: UUID
    distributions: list[QuestionDistributionPublic]


class CrossTabRequest(BaseModel):
    question_a_id: UUID
    question_b_id: UUID
    filters: list[AnalyticsFilter] = Field(default_factory=list)


class CrossTabCellPublic(BaseModel):
    row_label: str
    col_label: str
    count: int
    percent: float


class CrossTabResultPublic(BaseModel):
    question_a_id: UUID
    question_a_text: str
    question_b_id: UUID
    question_b_text: str
    row_labels: list[str]
    col_labels: list[str]
    cells: list[CrossTabCellPublic]
    total_responses: int
