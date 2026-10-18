"""surveys + sections + questions (builder Phase 4)

Revision ID: 0008_surveys
Revises: 0007_survey_plans
Create Date: 2026-10-18
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0008_surveys"
down_revision: str | None = "0007_survey_plans"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "surveys",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status", sa.String(length=32), nullable=False, server_default="draft"
        ),
        sa.Column(
            "anonymous_collection",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("current_version_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["plan_id"], ["survey_plans.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_surveys_created_by"), "surveys", ["created_by"])
    op.create_index(op.f("ix_surveys_organization_id"), "surveys", ["organization_id"])
    op.create_index(op.f("ix_surveys_plan_id"), "surveys", ["plan_id"])

    op.create_table(
        "sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("survey_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sections_survey_id"), "sections", ["survey_id"])

    op.create_table(
        "questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("survey_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("help_text", sa.Text(), nullable=True),
        sa.Column(
            "is_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "validation_rules", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "conditional_logic", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "source", sa.String(length=32), nullable=False, server_default="manual"
        ),
        sa.Column(
            "ai_generation_meta", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["section_id"], ["sections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_questions_section_id"), "questions", ["section_id"])
    op.create_index(op.f("ix_questions_survey_id"), "questions", ["survey_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_questions_survey_id"), table_name="questions")
    op.drop_index(op.f("ix_questions_section_id"), table_name="questions")
    op.drop_table("questions")
    op.drop_index(op.f("ix_sections_survey_id"), table_name="sections")
    op.drop_table("sections")
    op.drop_index(op.f("ix_surveys_plan_id"), table_name="surveys")
    op.drop_index(op.f("ix_surveys_organization_id"), table_name="surveys")
    op.drop_index(op.f("ix_surveys_created_by"), table_name="surveys")
    op.drop_table("surveys")
