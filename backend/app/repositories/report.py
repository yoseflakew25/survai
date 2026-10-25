"""Report / chat / export / saved-analysis repositories."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.report import ExportRecord, Report, ReportChatMessage, SavedAnalysis
from app.repositories.base import BaseRepository


class ReportRepository(BaseRepository[Report]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Report)

    async def latest_for_survey(self, *, survey_id: UUID) -> Report | None:
        result = await self.session.execute(
            select(Report)
            .where(Report.survey_id == survey_id)
            .order_by(Report.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def latest_for_version(
        self, *, survey_id: UUID, survey_version_id: UUID
    ) -> Report | None:
        """Latest report pinned to the same frozen version as analytics/respondents."""
        result = await self.session.execute(
            select(Report)
            .where(
                Report.survey_id == survey_id,
                Report.survey_version_id == survey_version_id,
            )
            .order_by(Report.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_for_org(
        self, *, report_id: UUID, organization_id: UUID
    ) -> Report | None:
        from app.models.survey import Survey

        result = await self.session.execute(
            select(Report)
            .join(Survey, Survey.id == Report.survey_id)
            .where(
                Report.id == report_id,
                Survey.organization_id == organization_id,
            )
            .options(selectinload(Report.chat_messages))
        )
        return result.scalar_one_or_none()


class ReportChatRepository(BaseRepository[ReportChatMessage]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ReportChatMessage)

    async def list_for_report(
        self, *, report_id: UUID, limit: int | None = None
    ) -> list[ReportChatMessage]:
        stmt = (
            select(ReportChatMessage)
            .where(ReportChatMessage.report_id == report_id)
            .order_by(ReportChatMessage.created_at.asc())
        )
        if limit is not None and limit > 0:
            # Newest N, then restore chronological order for the UI/prompt.
            stmt = (
                select(ReportChatMessage)
                .where(ReportChatMessage.report_id == report_id)
                .order_by(ReportChatMessage.created_at.desc())
                .limit(limit)
            )
            result = await self.session.execute(stmt)
            rows = list(result.scalars().all())
            rows.reverse()
            return rows
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class SavedAnalysisRepository(BaseRepository[SavedAnalysis]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, SavedAnalysis)

    async def list_for_survey(
        self, *, survey_id: UUID
    ) -> list[SavedAnalysis]:
        result = await self.session.execute(
            select(SavedAnalysis)
            .where(SavedAnalysis.survey_id == survey_id)
            .order_by(SavedAnalysis.created_at.desc())
        )
        return list(result.scalars().all())


class ExportRepository(BaseRepository[ExportRecord]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ExportRecord)

    async def get_by_id(self, export_id: UUID) -> ExportRecord | None:
        result = await self.session.execute(
            select(ExportRecord).where(ExportRecord.id == export_id)
        )
        return result.scalar_one_or_none()
