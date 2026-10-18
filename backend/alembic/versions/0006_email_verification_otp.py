"""email verification OTP + users.email_verified

Revision ID: 0006_email_verification
Revises: 0005_rbac_roles
Create Date: 2026-10-18
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006_email_verification"
down_revision: str | None = "0005_rbac_roles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    # New signups set email_verified=false explicitly; existing accounts stay verified.
    op.alter_column("users", "email_verified", server_default=None)

    op.create_table(
        "email_verification_otps",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_verification_otps_user_id"),
        "email_verification_otps",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_verification_otps_code_hash"),
        "email_verification_otps",
        ["code_hash"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_email_verification_otps_code_hash"), table_name="email_verification_otps")
    op.drop_index(op.f("ix_email_verification_otps_user_id"), table_name="email_verification_otps")
    op.drop_table("email_verification_otps")
    op.drop_column("users", "email_verified")
