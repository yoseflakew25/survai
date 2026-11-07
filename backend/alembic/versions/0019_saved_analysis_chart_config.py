"""Add chart_config JSON to saved_analyses.

Revision ID: 0019
Revises: 0018_collection_compare
Create Date: 2026-11-06
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0019_saved_analysis_chart_config"
down_revision: Union[str, None] = "0018_collection_compare"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "saved_analyses",
        sa.Column(
            "chart_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("saved_analyses", "chart_config")
