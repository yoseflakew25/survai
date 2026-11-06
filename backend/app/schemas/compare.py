"""Baseline vs endline comparison schemas."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class CompareSurveyRef(BaseModel):
    id: UUID
    title: str
    wave_label: str | None = None
    response_count: int = 0
    status: str


class CompareQuestionPair(BaseModel):
    prompt_text: str
    baseline_question_id: UUID | None = None
    endline_question_id: UUID | None = None
    baseline_distribution: list[dict[str, Any]] = Field(default_factory=list)
    endline_distribution: list[dict[str, Any]] = Field(default_factory=list)


class SurveyCompareResponse(BaseModel):
    family_id: UUID
    baseline: CompareSurveyRef
    endline: CompareSurveyRef
    unmatched_baseline: list[str] = Field(default_factory=list)
    unmatched_endline: list[str] = Field(default_factory=list)
    pairs: list[CompareQuestionPair] = Field(default_factory=list)
