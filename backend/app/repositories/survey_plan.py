from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.survey_plan import SurveyPlan
from app.repositories.base import BaseRepository


class SurveyPlanRepository(BaseRepository[SurveyPlan]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, SurveyPlan)

    async def list_for_org(
        self,
        *,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[SurveyPlan]:
        result = await self.session.execute(
            select(SurveyPlan)
            .where(SurveyPlan.organization_id == organization_id)
            .order_by(SurveyPlan.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_for_org(self, *, organization_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(SurveyPlan)
            .where(SurveyPlan.organization_id == organization_id)
        )
        return int(result.scalar_one())

    async def get_for_org(
        self, *, plan_id: UUID, organization_id: UUID
    ) -> SurveyPlan | None:
        result = await self.session.execute(
            select(SurveyPlan).where(
                SurveyPlan.id == plan_id,
                SurveyPlan.organization_id == organization_id,
            )
        )
        return result.scalar_one_or_none()
