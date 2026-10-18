"""organization description and website

Revision ID: 0004_org_settings_fields
Revises: 0003_user_profile_fields
Create Date: 2026-10-18
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_org_settings_fields"
down_revision: str | None = "0003_user_profile_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("organizations", sa.Column("website", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "website")
    op.drop_column("organizations", "description")
