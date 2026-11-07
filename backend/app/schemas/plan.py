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


class PlanInterviewMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class PlanInterviewTurnRequest(BaseModel):
    """Stateless interview turn — FE sends prior transcript + new user message."""

    messages: list[PlanInterviewMessage] = Field(default_factory=list, max_length=40)
    content: str = Field(min_length=1, max_length=4000)


class PlanInterviewBriefPublic(BaseModel):
    title_hint: str = ""
    audiences: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    summary: str = ""


class PlanInterviewTurnResponse(BaseModel):
    assistant_reply: str
    ready_to_generate: bool
    research_goal_draft: str
    brief: PlanInterviewBriefPublic


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
    # True once the linked survey has generated questions — plan is immutable.
    is_locked: bool = False
    linked_survey_id: UUID | None = None
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
