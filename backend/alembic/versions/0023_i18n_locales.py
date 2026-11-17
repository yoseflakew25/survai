"""content_language on plans/surveys + users.ui_locale

Revision ID: 0023
Revises: 0022_user_last_country
Create Date: 2026-11-16
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0023_i18n_locales"
down_revision: Union[str, None] = "0022_user_last_country"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "survey_plans",
        sa.Column(
            "content_language",
            sa.String(length=8),
            nullable=False,
            server_default="en",
        ),
    )
    op.add_column(
        "surveys",
        sa.Column(
            "content_language",
            sa.String(length=8),
            nullable=False,
            server_default="en",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "ui_locale",
            sa.String(length=8),
            nullable=False,
            server_default="en",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "ui_locale")
    op.drop_column("surveys", "content_language")
    op.drop_column("survey_plans", "content_language")
