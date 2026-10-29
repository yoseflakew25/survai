"""Background job status schemas (ARQ)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

JobStatusLiteral = Literal[
    "queued",
    "deferred",
    "in_progress",
    "complete",
    "not_found",
    "failed",
]


class JobAccepted(BaseModel):
    job_id: str
    status: Literal["queued"] = "queued"
    poll_url: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatusLiteral
    result: dict[str, Any] | None = None
    error: str | None = None
