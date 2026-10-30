"""Notification persistence."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.repositories.base import BaseRepository

_RESPONSE_EMAIL_TYPES = ("response_milestone", "response_digest")


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Notification)

    async def list_for_user(
        self, *, user_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[Notification]:
        result = await self.session.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_for_user(self, *, user_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id)
        )
        return int(result.scalar_one())

    async def unread_count(self, *, user_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
        return int(result.scalar_one())

    async def get_for_user(
        self, *, notification_id: UUID, user_id: UUID
    ) -> Notification | None:
        result = await self.session.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def mark_read(
        self, *, notification_id: UUID, user_id: UUID, when: datetime
    ) -> Notification | None:
        row = await self.get_for_user(notification_id=notification_id, user_id=user_id)
        if row is None:
            return None
        if row.read_at is None:
            row.read_at = when
            await self.session.flush()
        return row

    async def mark_all_read(self, *, user_id: UUID, when: datetime) -> int:
        result = await self.session.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
            .values(read_at=when)
        )
        await self.session.flush()
        return int(result.rowcount or 0)

    async def latest_response_email_marker(
        self, *, organization_id: UUID, survey_id: UUID
    ) -> Notification | None:
        """Most recent milestone/digest (email-worthy) for a survey."""
        survey_key = str(survey_id)
        result = await self.session.execute(
            select(Notification)
            .where(
                Notification.organization_id == organization_id,
                Notification.type.in_(_RESPONSE_EMAIL_TYPES),
            )
            .order_by(Notification.created_at.desc())
            .limit(40)
        )
        for row in result.scalars().all():
            meta = row.meta or {}
            if str(meta.get("survey_id") or "") == survey_key:
                return row
        return None
