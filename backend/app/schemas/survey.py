"""Survey / section / question API schemas (snake_case JSON)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

QuestionTypeLiteral = Literal[
    "short_text",
    "long_text",
    "single_choice",
    "multiple_choice",
    "dropdown",
    "rating_scale",
    "number",
    "date",
]
QuestionSourceLiteral = Literal["ai_generated", "manual", "ai_edited"]
SurveyStatusLiteral = Literal["draft", "published", "closed", "archived"]


class QuestionOptionPublic(BaseModel):
    id: str
    label: str
    value: str


class QuestionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    section_id: UUID
    survey_id: UUID
    type: QuestionTypeLiteral
    prompt_text: str
    help_text: str | None = None
    is_required: bool
    order_index: int
    options: list[QuestionOptionPublic] | list[dict[str, Any]] | None = None
    validation_rules: dict[str, Any] | None = None
    conditional_logic: dict[str, Any] | None = None
    source: QuestionSourceLiteral
    ai_generation_meta: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class SectionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    survey_id: UUID
    title: str
    description: str | None = None
    order_index: int
    questions: list[QuestionPublic] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class SurveyPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plan_id: UUID | None
    organization_id: UUID | None
    created_by: UUID
    title: str
    description: str | None = None
    status: SurveyStatusLiteral
    anonymous_collection: bool
    current_version_id: UUID | None = None
    sections: list[SectionPublic] = Field(default_factory=list)
    # Populated on list endpoints so we can skip loading the full tree.
    sections_count: int | None = None
    questions_count: int | None = None
    responses_count: int | None = None
    created_at: datetime
    updated_at: datetime


class SurveyListResponse(BaseModel):
    surveys: list[SurveyPublic]
    total: int


class SurveyCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    plan_id: UUID | None = None
    anonymous_collection: bool = True


class SurveyCreateFromPlan(BaseModel):
    plan_id: UUID
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    generate: bool = True


class SurveyUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    status: SurveyStatusLiteral | None = None
    anonymous_collection: bool | None = None


class SectionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=2000)
    order_index: int | None = Field(default=None, ge=0)


class SectionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=2000)
    order_index: int | None = Field(default=None, ge=0)


class SectionReorder(BaseModel):
    section_ids: list[UUID] = Field(min_length=1)


class QuestionCreate(BaseModel):
    section_id: UUID
    type: QuestionTypeLiteral
    prompt_text: str = Field(min_length=1, max_length=2000)
    help_text: str | None = Field(default=None, max_length=1000)
    is_required: bool = False
    order_index: int | None = Field(default=None, ge=0)
    options: list[QuestionOptionPublic] | None = None
    validation_rules: dict[str, Any] | None = None
    conditional_logic: dict[str, Any] | None = None


class QuestionUpdate(BaseModel):
    type: QuestionTypeLiteral | None = None
    prompt_text: str | None = Field(default=None, min_length=1, max_length=2000)
    help_text: str | None = Field(default=None, max_length=1000)
    is_required: bool | None = None
    order_index: int | None = Field(default=None, ge=0)
    options: list[QuestionOptionPublic] | None = None
    validation_rules: dict[str, Any] | None = None
    conditional_logic: dict[str, Any] | None = None
    source: QuestionSourceLiteral | None = None


class QuestionReorder(BaseModel):
    section_id: UUID
    question_ids: list[UUID] = Field(min_length=1)


class SurveyGenerateResponse(BaseModel):
    survey: SurveyPublic
    notes: str | None = None
