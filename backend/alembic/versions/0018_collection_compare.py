"""Collection quota/close date + instrument family for compare.

Revision ID: 0018
Revises: 0017_org_seats
Create Date: 2026-11-06
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0018_collection_compare"
down_revision: Union[str, None] = "0017_org_seats"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "surveys", sa.Column("response_quota", sa.Integer(), nullable=True)
    )
    op.add_column(
        "surveys",
        sa.Column("closes_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "surveys", sa.Column("instrument_family_id", sa.Uuid(), nullable=True)
    )
    op.add_column(
        "surveys", sa.Column("wave_label", sa.String(length=64), nullable=True)
    )
    op.create_index(
        op.f("ix_surveys_instrument_family_id"),
        "surveys",
        ["instrument_family_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_surveys_instrument_family_id"), table_name="surveys")
    op.drop_column("surveys", "wave_label")
    op.drop_column("surveys", "instrument_family_id")
    op.drop_column("surveys", "closes_at")
    op.drop_column("surveys", "response_quota")
