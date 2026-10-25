"""Report API schemas — snake_case JSON."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

ReportAudienceLiteral = Literal["internal", "donor", "executive_summary"]
ReportStatusLiteral = Literal["draft", "final"]
ChatConfidenceLiteral = Literal["grounded", "partial", "insufficient_data"]


class ReportSectionPublic(BaseModel):
    id: str
    title: str
    content: str
    metric_refs: list[str] = Field(default_factory=list)


class ReportStatsPublic(BaseModel):
    response_count: int
    completion_rate: float
    avg_completion_minutes: float | None = None
    questions_count: int


class ReportIntegrityPublic(BaseModel):
    """Version + snapshot integrity vs live analytics (same rules as respondents)."""

    matches_current_version: bool
    is_stale: bool
    snapshot_response_count: int
    live_response_count: int | None = None
    snapshot_survey_version_id: UUID
    current_survey_version_id: UUID | None = None


class ReportPublic(BaseModel):
    id: UUID
    survey_id: UUID
    survey_version_id: UUID
    survey_title: str
    title: str
    audience: ReportAudienceLiteral
    status: ReportStatusLiteral
    model: str | None = None
    stats: ReportStatsPublic
    sections: list[ReportSectionPublic]
    integrity: ReportIntegrityPublic
    created_at: datetime
    updated_at: datetime


class ReportCreateRequest(BaseModel):
    audience: ReportAudienceLiteral = "internal"
    title: str | None = None


class ReportUpdateRequest(BaseModel):
    title: str | None = None
    status: ReportStatusLiteral | None = None
    sections: list[ReportSectionPublic] | None = None


class ReportSectionRegenerateRequest(BaseModel):
    section_id: str


class ReportChatMessagePublic(BaseModel):
    id: UUID
    role: Literal["user", "assistant"]
    content: str
    metric_refs: list[str] = Field(default_factory=list)
    confidence: ChatConfidenceLiteral | None = None
    created_at: datetime


class ReportChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ReportChatResponse(BaseModel):
    messages: list[ReportChatMessagePublic]


class ExportPublic(BaseModel):
    id: UUID
    type: Literal["docx", "pdf", "csv", "markdown"]
    status: str
    content_text: str | None = None
    file_url: str | None = None
    created_at: datetime


class ExportRequest(BaseModel):
    type: Literal["docx", "pdf", "markdown"] = "markdown"


class SavedAnalysisPublic(BaseModel):
    id: UUID
    survey_id: UUID
    name: str
    filters: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime


class SavedAnalysisCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    filters: list[dict[str, Any]] = Field(default_factory=list)
