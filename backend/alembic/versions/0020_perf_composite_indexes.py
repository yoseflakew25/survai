"""Composite indexes for common list/filter queries.

Revision ID: 0020
Revises: 0019_saved_analysis_chart_config
Create Date: 2026-11-07
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0020_perf_composite_indexes"
down_revision: Union[str, None] = "0019_saved_analysis_chart_config"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_surveys_org_updated_at",
        "surveys",
        ["organization_id", "updated_at"],
        unique=False,
    )
    op.create_index(
        "ix_surveys_org_status",
        "surveys",
        ["organization_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_respondents_version_completed",
        "respondents",
        ["survey_version_id", "completed_at"],
        unique=False,
    )
    op.create_index(
        "ix_respondents_survey_completed",
        "respondents",
        ["survey_id", "completed_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_respondents_survey_completed", table_name="respondents")
    op.drop_index("ix_respondents_version_completed", table_name="respondents")
    op.drop_index("ix_surveys_org_status", table_name="surveys")
    op.drop_index("ix_surveys_org_updated_at", table_name="surveys")
