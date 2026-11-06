"""Org assistant API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AssistantThreadCreate(BaseModel):
    title: str | None = Field(default=None, max_length=255)


class AssistantThreadUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class AssistantThreadPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


class AssistantThreadListResponse(BaseModel):
    threads: list[AssistantThreadPublic]
    total: int


class AssistantMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=8000)


class AssistantMessagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: Literal["user", "assistant", "system"]
    content: str
    citations: list[dict[str, Any]] | None = None
    tool_trace: list[Any] | dict[str, Any] | None = None
    created_at: datetime


class AssistantMessageListResponse(BaseModel):
    messages: list[AssistantMessagePublic]


class AssistantSendResponse(BaseModel):
    thread: AssistantThreadPublic
    messages: list[AssistantMessagePublic]


class KnowledgeReindexResponse(BaseModel):
    surveys: int
    reports: int
    reviews: int
