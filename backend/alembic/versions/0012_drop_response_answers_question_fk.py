"""Drop response_answers.question_id FK so published snapshots stay collectable.

Answers are keyed to question UUIDs inside survey_versions.structure_snapshot.
When a draft is regenerated, live questions rows are replaced — the FK then
blocks inserts for still-valid published versions.

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-25
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0012_drop_answer_q_fk"
down_revision: Union[str, None] = "0011_collection"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Constraint name from 0011 create_table ForeignKey on question_id.
    op.drop_constraint(
        "response_answers_question_id_fkey",
        "response_answers",
        type_="foreignkey",
    )


def downgrade() -> None:
    op.create_foreign_key(
        "response_answers_question_id_fkey",
        "response_answers",
        "questions",
        ["question_id"],
        ["id"],
        ondelete="RESTRICT",
    )
