"""Survey plan API schemas (snake_case JSON)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProposedSectionPublic(BaseModel):
    title: str
    rationale: str


class AiGenerationMetaPublic(BaseModel):
    model: str
    prompt_version: str
    request_id: str
    latency_ms: int


class PlanCreate(BaseModel):
    research_goal: str = Field(min_length=10, max_length=5000)


class PlanUpdate(BaseModel):
    research_goal: str | None = Field(default=None, min_length=10, max_length=5000)
    objectives: list[str] | None = None
    research_questions: list[str] | None = None
    target_respondents: list[str] | None = None
    proposed_sections: list[ProposedSectionPublic] | None = None
    estimated_length_minutes: int | None = Field(default=None, ge=1, le=180)
    status: Literal["draft", "approved"] | None = None


class PlanGenerateRequest(BaseModel):
    """Optional body for re-generate — updates the goal then hard-replaces AI fields."""

    research_goal: str | None = Field(default=None, min_length=10, max_length=5000)


class PlanPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_by: UUID
    organization_id: UUID | None
    research_goal: str
    objectives: list[str]
    research_questions: list[str]
    target_respondents: list[str]
    proposed_sections: list[ProposedSectionPublic]
    estimated_length_minutes: int | None
    status: str
    ai_generation_meta: AiGenerationMetaPublic | dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class PlanListResponse(BaseModel):
    plans: list[PlanPublic]
    total: int


class SurveyPlanGenerateResponse(BaseModel):
    """AI generate result — plan row updated + raw schema fields for the editor."""

    plan: PlanPublic
    objectives: list[str]
    research_questions: list[str]
    target_respondents: list[str]
    proposed_sections: list[ProposedSectionPublic]
    estimated_length_minutes: int
    notes: str | None = None
