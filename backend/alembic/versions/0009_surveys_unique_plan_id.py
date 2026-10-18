"""Enforce 1 survey plan → 1 survey (unique plan_id)

Revision ID: 0009_surveys_unique_plan
Revises: 0008_surveys
Create Date: 2026-10-18
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0009_surveys_unique_plan"
down_revision: str | None = "0008_surveys"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Keep the newest survey per plan; drop older duplicates (and their trees via CASCADE).
    op.execute(
        """
        DELETE FROM surveys
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY plan_id
                           ORDER BY updated_at DESC, created_at DESC
                       ) AS rn
                FROM surveys
                WHERE plan_id IS NOT NULL
            ) ranked
            WHERE rn > 1
        )
        """
    )
    op.create_unique_constraint("uq_surveys_plan_id", "surveys", ["plan_id"])


def downgrade() -> None:
    op.drop_constraint("uq_surveys_plan_id", "surveys", type_="unique")
