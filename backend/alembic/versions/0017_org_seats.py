"""Org seats: researcher/viewer roles + org_invites.

Revision ID: 0017
Revises: 0016_org_assistant
Create Date: 2026-11-06
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0017_org_seats"
down_revision: Union[str, None] = "0016_org_assistant"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users.role is VARCHAR (native_enum=False) — new values need no ALTER TYPE.
    op.create_table(
        "org_invites",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("invited_by", sa.Uuid(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["invited_by"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        op.f("ix_org_invites_organization_id"),
        "org_invites",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_org_invites_email"), "org_invites", ["email"], unique=False
    )
    # One pending invite per org+email (accepted rows can remain for audit).
    op.create_index(
        "uq_org_invites_org_email_pending",
        "org_invites",
        ["organization_id", "email"],
        unique=True,
        postgresql_where=sa.text("accepted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_org_invites_email"), table_name="org_invites")
    op.drop_index(op.f("ix_org_invites_organization_id"), table_name="org_invites")
    op.drop_table("org_invites")
