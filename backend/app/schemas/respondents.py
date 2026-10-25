"""Respondent list + detail schemas (authenticated survey owner views)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

RespondentStatusLiteral = Literal["completed", "partial"]


class RespondentListItemPublic(BaseModel):
    id: UUID
    name: str
    email: str
    status: RespondentStatusLiteral
    submitted_at: datetime
    duration_seconds: int
    survey_version_id: UUID


class RespondentsSummaryPublic(BaseModel):
    responses: int
    completed: int
    partial: int
    avg_duration_seconds: int


class ActiveRespondentFilterPublic(BaseModel):
    question_id: UUID
    question_text: str
    answer: str
    count: int


class RespondentsListPublic(BaseModel):
    survey_id: UUID
    total: int
    respondents: list[RespondentListItemPublic]
    summary: RespondentsSummaryPublic
    active_filter: ActiveRespondentFilterPublic | None = None


class RespondentAnswerPublic(BaseModel):
    question_id: UUID
    section_title: str
    prompt_text: str
    help_text: str | None = None
    question_type: str
    answered: bool
    value: Any = None
    scale_max: float | None = None


class RespondentDetailPublic(BaseModel):
    id: UUID
    name: str
    email: str
    status: RespondentStatusLiteral
    submitted_at: datetime
    duration_seconds: int
    survey_id: UUID
    survey_version_id: UUID
    survey_title: str
    survey_status: str
    anonymous_collection: bool
    answers: list[RespondentAnswerPublic] = Field(default_factory=list)
