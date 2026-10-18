"""Survey plan ORM — research design before builder (plan.md §6)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base

# JSONB on Postgres; plain JSON on SQLite (tests).
JsonType = JSON().with_variant(JSONB(), "postgresql")


class PlanStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"


class SurveyPlan(Base):
    __tablename__ = "survey_plans"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    research_goal: Mapped[str] = mapped_column(Text, nullable=False)
    objectives: Mapped[list[Any]] = mapped_column(JsonType, nullable=False, default=list)
    research_questions: Mapped[list[Any]] = mapped_column(
        JsonType, nullable=False, default=list
    )
    target_respondents: Mapped[list[Any]] = mapped_column(
        JsonType, nullable=False, default=list
    )
    proposed_sections: Mapped[list[Any]] = mapped_column(
        JsonType, nullable=False, default=list
    )
    estimated_length_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=PlanStatus.draft.value
    )
    ai_generation_meta: Mapped[dict[str, Any] | None] = mapped_column(
        JsonType, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
