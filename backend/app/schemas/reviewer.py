"""Reviewer report / finding API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

IssueTypeLiteral = Literal[
    "leading_wording",
    "double_barreled",
    "ambiguous",
    "objective_misalignment",
    "other",
]
FindingStatusLiteral = Literal["open", "accepted", "dismissed"]


class ScoreCriterionPublic(BaseModel):
    label: str
    score: float
    description: str


class ReviewerFindingPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reviewer_report_id: UUID
    question_id: UUID | None = None
    question_text: str | None = None
    section_title: str | None = None
    issue_type: IssueTypeLiteral
    explanation: str
    suggested_rewrite: str | None = None
    status: FindingStatusLiteral
    created_at: datetime


class ReviewerReportPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    survey_id: UUID
    overall_quality_score: float | None = None
    estimated_completion_minutes: int | None = None
    required_question_count: int | None = None
    score_criteria: list[ScoreCriterionPublic] | list[dict[str, Any]] | None = None
    findings: list[ReviewerFindingPublic] = Field(default_factory=list)
    ai_generation_meta: dict[str, Any] | None = None
    notes: str | None = None
    created_at: datetime


class FindingStatusUpdate(BaseModel):
    status: FindingStatusLiteral
