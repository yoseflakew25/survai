"""Survey version / respondent / answer repositories."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import Respondent, ResponseAnswer, SurveyVersion
from app.repositories.base import BaseRepository


class SurveyVersionRepository(BaseRepository[SurveyVersion]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, SurveyVersion)

    async def get_by_id(self, version_id: UUID) -> SurveyVersion | None:
        result = await self.session.execute(
            select(SurveyVersion).where(SurveyVersion.id == version_id)
        )
        return result.scalar_one_or_none()

    async def next_version_number(self, *, survey_id: UUID) -> int:
        result = await self.session.execute(
            select(func.coalesce(func.max(SurveyVersion.version_number), 0)).where(
                SurveyVersion.survey_id == survey_id
            )
        )
        return int(result.scalar_one()) + 1


class RespondentRepository(BaseRepository[Respondent]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Respondent)

    async def get_by_id(self, respondent_id: UUID) -> Respondent | None:
        result = await self.session.execute(
            select(Respondent).where(Respondent.id == respondent_id)
        )
        return result.scalar_one_or_none()

    async def count_completed_for_survey(self, *, survey_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(Respondent)
            .where(
                Respondent.survey_id == survey_id,
                Respondent.completed_at.is_not(None),
            )
        )
        return int(result.scalar_one())


class ResponseAnswerRepository(BaseRepository[ResponseAnswer]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ResponseAnswer)

    async def get_for_respondent_question(
        self, *, respondent_id: UUID, question_id: UUID
    ) -> ResponseAnswer | None:
        result = await self.session.execute(
            select(ResponseAnswer).where(
                ResponseAnswer.respondent_id == respondent_id,
                ResponseAnswer.question_id == question_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_respondent(
        self, *, respondent_id: UUID
    ) -> list[ResponseAnswer]:
        result = await self.session.execute(
            select(ResponseAnswer).where(
                ResponseAnswer.respondent_id == respondent_id
            )
        )
        return list(result.scalars().all())
