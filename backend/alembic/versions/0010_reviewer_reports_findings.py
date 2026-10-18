"""reviewer_reports + reviewer_findings (REV Phase)

Revision ID: 0010_reviewer
Revises: 0009_surveys_unique_plan
Create Date: 2026-10-18
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0010_reviewer"
down_revision: str | None = "0009_surveys_unique_plan"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reviewer_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("survey_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("overall_quality_score", sa.Numeric(3, 1), nullable=True),
        sa.Column("estimated_completion_minutes", sa.Integer(), nullable=True),
        sa.Column("required_question_count", sa.Integer(), nullable=True),
        sa.Column(
            "score_criteria",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "ai_generation_meta",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["survey_id"], ["surveys.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_reviewer_reports_survey_id"),
        "reviewer_reports",
        ["survey_id"],
    )

    op.create_table(
        "reviewer_findings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "reviewer_report_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("issue_type", sa.String(length=64), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("suggested_rewrite", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="open",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["question_id"], ["questions.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["reviewer_report_id"],
            ["reviewer_reports.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_reviewer_findings_reviewer_report_id"),
        "reviewer_findings",
        ["reviewer_report_id"],
    )
    op.create_index(
        op.f("ix_reviewer_findings_question_id"),
        "reviewer_findings",
        ["question_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_reviewer_findings_question_id"), table_name="reviewer_findings"
    )
    op.drop_index(
        op.f("ix_reviewer_findings_reviewer_report_id"),
        table_name="reviewer_findings",
    )
    op.drop_table("reviewer_findings")
    op.drop_index(
        op.f("ix_reviewer_reports_survey_id"), table_name="reviewer_reports"
    )
    op.drop_table("reviewer_reports")
