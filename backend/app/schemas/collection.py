"""Publish + public collection API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PublishResponse(BaseModel):
    survey_id: UUID
    version_id: UUID
    version_number: int
    status: str
    published_at: datetime
    collection_path: str


class CollectStatsPublic(BaseModel):
    survey_id: UUID
    response_count: int
    current_version_id: UUID | None = None
    status: str
    collection_path: str | None = None


class PublicQuestionOut(BaseModel):
    id: UUID
    type: str
    prompt_text: str
    help_text: str | None = None
    is_required: bool
    order_index: int
    options: list[dict[str, Any]] | None = None
    validation_rules: dict[str, Any] | None = None
    conditional_logic: dict[str, Any] | None = None


class PublicSectionOut(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    order_index: int
    questions: list[PublicQuestionOut] = Field(default_factory=list)


class PublicSurveyOut(BaseModel):
    id: UUID
    survey_version_id: UUID
    title: str
    description: str | None = None
    anonymous_collection: bool = True
    sections: list[PublicSectionOut] = Field(default_factory=list)


class RespondentPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    survey_version_id: UUID
    session_token: UUID
    is_anonymous: bool
    started_at: datetime
    completed_at: datetime | None = None


class AnswerUpsertBody(BaseModel):
    session_token: UUID
    question_id: UUID
    value: Any = None


class CompleteBody(BaseModel):
    session_token: UUID
