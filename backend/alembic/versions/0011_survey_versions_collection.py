"""survey_versions + respondents + response_answers (COL Phase)

Revision ID: 0011_collection
Revises: 0010_reviewer
Create Date: 2026-10-18
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0011_collection"
down_revision: str | None = "0010_reviewer"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "survey_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("survey_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column(
            "structure_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("published_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "published_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["survey_id"], ["surveys.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["published_by"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "survey_id", "version_number", name="uq_survey_versions_survey_number"
        ),
    )
    op.create_index(
        op.f("ix_survey_versions_survey_id"),
        "survey_versions",
        ["survey_id"],
    )

    op.create_foreign_key(
        "fk_surveys_current_version_id",
        "surveys",
        "survey_versions",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "respondents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("survey_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "survey_version_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("session_token", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "is_anonymous",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_hash", sa.Text(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["survey_id"], ["surveys.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["survey_version_id"],
            ["survey_versions.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_token"),
    )
    op.create_index(
        op.f("ix_respondents_survey_id"), "respondents", ["survey_id"]
    )
    op.create_index(
        op.f("ix_respondents_survey_version_id"),
        "respondents",
        ["survey_version_id"],
    )
    op.create_index(
        op.f("ix_respondents_session_token"),
        "respondents",
        ["session_token"],
    )

    op.create_table(
        "response_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("respondent_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "survey_version_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column(
            "answer_value",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "answered_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["respondent_id"], ["respondents.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["question_id"], ["questions.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["survey_version_id"],
            ["survey_versions.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "respondent_id",
            "question_id",
            name="uq_response_answers_respondent_question",
        ),
    )
    op.create_index(
        op.f("ix_response_answers_respondent_id"),
        "response_answers",
        ["respondent_id"],
    )
    op.create_index(
        op.f("ix_response_answers_question_id"),
        "response_answers",
        ["question_id"],
    )
    op.create_index(
        op.f("ix_response_answers_survey_version_id"),
        "response_answers",
        ["survey_version_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_response_answers_survey_version_id"),
        table_name="response_answers",
    )
    op.drop_index(
        op.f("ix_response_answers_question_id"), table_name="response_answers"
    )
    op.drop_index(
        op.f("ix_response_answers_respondent_id"),
        table_name="response_answers",
    )
    op.drop_table("response_answers")

    op.drop_index(op.f("ix_respondents_session_token"), table_name="respondents")
    op.drop_index(
        op.f("ix_respondents_survey_version_id"), table_name="respondents"
    )
    op.drop_index(op.f("ix_respondents_survey_id"), table_name="respondents")
    op.drop_table("respondents")

    op.drop_constraint(
        "fk_surveys_current_version_id", "surveys", type_="foreignkey"
    )

    op.drop_index(
        op.f("ix_survey_versions_survey_id"), table_name="survey_versions"
    )
    op.drop_table("survey_versions")
