"""audit_log + organization admin control columns

Revision ID: 0021
Revises: 0020_perf_composite_indexes
Create Date: 2026-11-11
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0021_admin_audit_org_flags"
down_revision: Union[str, None] = "0020_perf_composite_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("suspended_reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "feature_flags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "organizations",
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_organizations_is_active", "organizations", ["is_active"], unique=False
    )

    op.create_table(
        "audit_log",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("resource_type", sa.String(length=64), nullable=False),
        sa.Column("resource_id", sa.Uuid(), nullable=True),
        sa.Column("organization_id", sa.Uuid(), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("ip", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_log_action", "audit_log", ["action"], unique=False)
    op.create_index(
        "ix_audit_log_actor_user_id", "audit_log", ["actor_user_id"], unique=False
    )
    op.create_index(
        "ix_audit_log_organization_id",
        "audit_log",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_audit_log_created_at", "audit_log", ["created_at"], unique=False
    )
    op.create_index(
        "ix_audit_log_org_created",
        "audit_log",
        ["organization_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_audit_log_org_created", table_name="audit_log")
    op.drop_index("ix_audit_log_created_at", table_name="audit_log")
    op.drop_index("ix_audit_log_organization_id", table_name="audit_log")
    op.drop_index("ix_audit_log_actor_user_id", table_name="audit_log")
    op.drop_index("ix_audit_log_action", table_name="audit_log")
    op.drop_table("audit_log")

    op.drop_index("ix_organizations_is_active", table_name="organizations")
    op.drop_column("organizations", "notes")
    op.drop_column("organizations", "feature_flags")
    op.drop_column("organizations", "suspended_reason")
    op.drop_column("organizations", "suspended_at")
    op.drop_column("organizations", "is_active")
