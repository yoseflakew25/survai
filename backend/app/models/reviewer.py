"""Reviewer report / finding ORM — quality advisory (plan.md §6 / REV)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base

JsonType = JSON().with_variant(JSONB(), "postgresql")


class ReviewerIssueType(str, enum.Enum):
    leading_wording = "leading_wording"
    double_barreled = "double_barreled"
    ambiguous = "ambiguous"
    objective_misalignment = "objective_misalignment"
    other = "other"


class ReviewerFindingStatus(str, enum.Enum):
    open = "open"
    accepted = "accepted"
    dismissed = "dismissed"


class ReviewerReport(Base):
    __tablename__ = "reviewer_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    survey_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("surveys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    overall_quality_score: Mapped[float | None] = mapped_column(
        Numeric(3, 1), nullable=True
    )
    estimated_completion_minutes: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    required_question_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_criteria: Mapped[list[Any] | None] = mapped_column(JsonType, nullable=True)
    ai_generation_meta: Mapped[dict[str, Any] | None] = mapped_column(
        JsonType, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    findings: Mapped[list[ReviewerFinding]] = relationship(
        "ReviewerFinding",
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="ReviewerFinding.created_at",
    )


class ReviewerFinding(Base):
    __tablename__ = "reviewer_findings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    reviewer_report_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("reviewer_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("questions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    issue_type: Mapped[str] = mapped_column(String(64), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_rewrite: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ReviewerFindingStatus.open.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    report: Mapped[ReviewerReport] = relationship(
        "ReviewerReport", back_populates="findings"
    )
