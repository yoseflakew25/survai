"""Org assistant threads, messages, and RAG knowledge chunks.

Revision ID: 0016
Revises: 0015_notifications
Create Date: 2026-11-06
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0016_org_assistant"
down_revision: Union[str, None] = "0015_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assistant_threads",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_assistant_threads_organization_id"),
        "assistant_threads",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assistant_threads_user_id"),
        "assistant_threads",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "assistant_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("thread_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("citations", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("tool_trace", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["thread_id"], ["assistant_threads.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_assistant_messages_thread_id"),
        "assistant_messages",
        ["thread_id"],
        unique=False,
    )

    op.create_table(
        "org_knowledge_chunks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("survey_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("embedding", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_org_knowledge_chunks_organization_id"),
        "org_knowledge_chunks",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_org_knowledge_chunks_source_type"),
        "org_knowledge_chunks",
        ["source_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_org_knowledge_chunks_source_id"),
        "org_knowledge_chunks",
        ["source_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_org_knowledge_chunks_survey_id"),
        "org_knowledge_chunks",
        ["survey_id"],
        unique=False,
    )
    op.create_index(
        "ix_org_knowledge_chunks_org_source",
        "org_knowledge_chunks",
        ["organization_id", "source_type", "source_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_org_knowledge_chunks_org_source", table_name="org_knowledge_chunks"
    )
    op.drop_index(
        op.f("ix_org_knowledge_chunks_survey_id"), table_name="org_knowledge_chunks"
    )
    op.drop_index(
        op.f("ix_org_knowledge_chunks_source_id"), table_name="org_knowledge_chunks"
    )
    op.drop_index(
        op.f("ix_org_knowledge_chunks_source_type"), table_name="org_knowledge_chunks"
    )
    op.drop_index(
        op.f("ix_org_knowledge_chunks_organization_id"),
        table_name="org_knowledge_chunks",
    )
    op.drop_table("org_knowledge_chunks")
    op.drop_index(op.f("ix_assistant_messages_thread_id"), table_name="assistant_messages")
    op.drop_table("assistant_messages")
    op.drop_index(op.f("ix_assistant_threads_user_id"), table_name="assistant_threads")
    op.drop_index(
        op.f("ix_assistant_threads_organization_id"), table_name="assistant_threads"
    )
    op.drop_table("assistant_threads")
