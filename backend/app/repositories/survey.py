"""Survey / section / question repositories."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.survey import Question, Section, Survey
from app.repositories.base import BaseRepository


class SurveyRepository(BaseRepository[Survey]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Survey)

    async def list_for_org(
        self,
        *,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
        require_plan: bool = True,
    ) -> list[Survey]:
        stmt = select(Survey).where(Survey.organization_id == organization_id)
        if require_plan:
            stmt = stmt.where(Survey.plan_id.is_not(None))
        result = await self.session.execute(
            stmt.options(
                selectinload(Survey.sections).selectinload(Section.questions)
            )
            .order_by(Survey.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().unique().all())

    async def count_for_org(
        self, *, organization_id: UUID, require_plan: bool = True
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Survey)
            .where(Survey.organization_id == organization_id)
        )
        if require_plan:
            stmt = stmt.where(Survey.plan_id.is_not(None))
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def get_for_org(
        self, *, survey_id: UUID, organization_id: UUID
    ) -> Survey | None:
        result = await self.session.execute(
            select(Survey)
            .where(
                Survey.id == survey_id,
                Survey.organization_id == organization_id,
            )
            .options(
                selectinload(Survey.sections).selectinload(Section.questions)
            )
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_by_plan_id(
        self, *, plan_id: UUID, organization_id: UUID
    ) -> Survey | None:
        """At most one survey per plan (uq_surveys_plan_id)."""
        result = await self.session.execute(
            select(Survey)
            .where(
                Survey.plan_id == plan_id,
                Survey.organization_id == organization_id,
            )
            .options(
                selectinload(Survey.sections).selectinload(Section.questions)
            )
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def delete_all_sections(self, *, survey_id: UUID) -> None:
        """Hard-delete the section/question tree (questions first for SQLite)."""
        await self.session.execute(
            delete(Question).where(Question.survey_id == survey_id)
        )
        await self.session.execute(
            delete(Section).where(Section.survey_id == survey_id)
        )
        await self.session.flush()


class SectionRepository(BaseRepository[Section]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Section)

    async def get_for_survey(
        self, *, section_id: UUID, survey_id: UUID
    ) -> Section | None:
        result = await self.session.execute(
            select(Section)
            .where(Section.id == section_id, Section.survey_id == survey_id)
            .options(selectinload(Section.questions))
        )
        return result.scalar_one_or_none()

    async def delete_questions(self, *, section_id: UUID) -> None:
        await self.session.execute(
            delete(Question).where(Question.section_id == section_id)
        )
        await self.session.flush()


class QuestionRepository(BaseRepository[Question]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Question)

    async def get_for_survey(
        self, *, question_id: UUID, survey_id: UUID
    ) -> Question | None:
        result = await self.session.execute(
            select(Question).where(
                Question.id == question_id, Question.survey_id == survey_id
            )
        )
        return result.scalar_one_or_none()
