"""Reviewer report / finding repositories."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.reviewer import ReviewerFinding, ReviewerReport
from app.repositories.base import BaseRepository


class ReviewerReportRepository(BaseRepository[ReviewerReport]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ReviewerReport)

    async def latest_for_survey(self, *, survey_id: UUID) -> ReviewerReport | None:
        result = await self.session.execute(
            select(ReviewerReport)
            .where(ReviewerReport.survey_id == survey_id)
            .options(selectinload(ReviewerReport.findings))
            .order_by(ReviewerReport.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def delete_for_survey(self, *, survey_id: UUID) -> None:
        """Drop all reports (findings cascade) when the questionnaire is replaced."""
        await self.session.execute(
            delete(ReviewerReport).where(ReviewerReport.survey_id == survey_id)
        )
        await self.session.flush()


class ReviewerFindingRepository(BaseRepository[ReviewerFinding]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ReviewerFinding)

    async def get_for_org_survey(
        self, *, finding_id: UUID, organization_id: UUID
    ) -> ReviewerFinding | None:
        from app.models.survey import Survey

        result = await self.session.execute(
            select(ReviewerFinding)
            .join(ReviewerReport, ReviewerFinding.reviewer_report_id == ReviewerReport.id)
            .join(Survey, ReviewerReport.survey_id == Survey.id)
            .where(
                ReviewerFinding.id == finding_id,
                Survey.organization_id == organization_id,
            )
            .options(selectinload(ReviewerFinding.report))
        )
        return result.scalar_one_or_none()
