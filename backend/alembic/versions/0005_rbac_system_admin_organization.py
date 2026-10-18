"""rbac roles: system_admin + organization

Revision ID: 0005_rbac_roles
Revises: 0004_org_settings_fields
Create Date: 2026-10-18
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_rbac_roles"
down_revision: str | None = "0004_org_settings_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Old Enum values fit in VARCHAR(10) ("researcher"); new roles need more room.
    op.alter_column(
        "users",
        "role",
        existing_type=sa.VARCHAR(length=10),
        type_=sa.String(length=32),
        existing_nullable=False,
    )

    # Stored as VARCHAR (native_enum=False) — remap values in place.
    # Default every account to organization, then elevate only the platform admin.
    op.execute(
        """
        UPDATE users
        SET role = 'organization',
            is_superuser = false
        """
    )
    op.execute(
        """
        UPDATE users
        SET role = 'system_admin',
            is_superuser = true
        WHERE email = 'yoseflakewdev@gmail.com'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE users
        SET role = 'admin'
        WHERE role = 'system_admin'
        """
    )
    op.execute(
        """
        UPDATE users
        SET role = 'researcher'
        WHERE role = 'organization'
        """
    )
    op.alter_column(
        "users",
        "role",
        existing_type=sa.String(length=32),
        type_=sa.VARCHAR(length=10),
        existing_nullable=False,
    )
