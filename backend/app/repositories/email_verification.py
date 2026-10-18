from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_verification import EmailVerificationOtp
from app.repositories.base import BaseRepository


class EmailVerificationRepository(BaseRepository[EmailVerificationOtp]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, EmailVerificationOtp)

    async def invalidate_active_for_user(self, user_id: UUID) -> None:
        """Mark unused OTPs for this user as used so only the latest is valid."""
        now = datetime.now(UTC)
        await self.session.execute(
            update(EmailVerificationOtp)
            .where(
                EmailVerificationOtp.user_id == user_id,
                EmailVerificationOtp.used_at.is_(None),
            )
            .values(used_at=now)
        )
        await self.session.flush()

    async def get_latest_valid(self, user_id: UUID) -> EmailVerificationOtp | None:
        now = datetime.now(UTC)
        result = await self.session.execute(
            select(EmailVerificationOtp)
            .where(
                EmailVerificationOtp.user_id == user_id,
                EmailVerificationOtp.used_at.is_(None),
                EmailVerificationOtp.expires_at > now,
            )
            .order_by(EmailVerificationOtp.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def mark_used(self, otp: EmailVerificationOtp) -> None:
        otp.used_at = datetime.now(UTC)
        await self.session.flush()
