"""users.last_country + last_seen_at for admin presence map

Revision ID: 0022
Revises: 0021_admin_audit_org_flags
Create Date: 2026-11-11
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0022_user_last_country"
down_revision: Union[str, None] = "0021_admin_audit_org_flags"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("last_country", sa.String(length=2), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_last_country", "users", ["last_country"])


def downgrade() -> None:
    op.drop_index("ix_users_last_country", table_name="users")
    op.drop_column("users", "last_seen_at")
    op.drop_column("users", "last_country")
