"""Notification API schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


NotificationTypeLiteral = Literal[
    "survey_published",
    "survey_closed",
    "response_received",
    "response_milestone",
    "response_digest",
    "review_complete",
    "report_ready",
    "report_failed",
]


class NotificationPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: NotificationTypeLiteral
    title: str
    body: str
    href: str | None = None
    meta: dict[str, Any] | None = None
    read_at: datetime | None = None
    created_at: datetime
    status: Literal["read", "unread"] = "unread"


class NotificationListResponse(BaseModel):
    notifications: list[NotificationPublic]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int = Field(ge=0)
