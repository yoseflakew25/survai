"""organizations.cso_profile JSON for detailed CSO metadata

Revision ID: 0024_org_cso_profile
Revises: 0023_i18n_locales
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0024_org_cso_profile"
down_revision = "0023_i18n_locales"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("cso_profile", JSONB().with_variant(sa.JSON(), "sqlite"), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("organizations", "cso_profile")