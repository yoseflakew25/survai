"""Survey / section / question ORM — builder domain (plan.md §6)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base

JsonType = JSON().with_variant(JSONB(), "postgresql")


class SurveyStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    closed = "closed"
    archived = "archived"


class QuestionType(str, enum.Enum):
    short_text = "short_text"
    long_text = "long_text"
    single_choice = "single_choice"
    multiple_choice = "multiple_choice"
    dropdown = "dropdown"
    rating_scale = "rating_scale"
    number = "number"
    date = "date"


class QuestionSource(str, enum.Enum):
    ai_generated = "ai_generated"
    manual = "manual"
    ai_edited = "ai_edited"


class Survey(Base):
    __tablename__ = "surveys"
    # One research plan → one survey questionnaire (NULLs allowed for unlinked drafts).
    __table_args__ = (UniqueConstraint("plan_id", name="uq_surveys_plan_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("survey_plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=SurveyStatus.draft.value
    )
    anonymous_collection: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    # FK to survey_versions added in Phase 5 (publish)
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    sections: Mapped[list[Section]] = relationship(
        "Section",
        back_populates="survey",
        cascade="all, delete-orphan",
        order_by="Section.order_index",
    )


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    survey_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("surveys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    survey: Mapped[Survey] = relationship("Survey", back_populates="sections")
    questions: Mapped[list[Question]] = relationship(
        "Question",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="Question.order_index",
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    survey_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("surveys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    help_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    options: Mapped[list[Any] | None] = mapped_column(JsonType, nullable=True)
    validation_rules: Mapped[dict[str, Any] | None] = mapped_column(
        JsonType, nullable=True
    )
    conditional_logic: Mapped[dict[str, Any] | None] = mapped_column(
        JsonType, nullable=True
    )
    source: Mapped[str] = mapped_column(
        String(32), nullable=False, default=QuestionSource.manual.value
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

    section: Mapped[Section] = relationship("Section", back_populates="questions")
