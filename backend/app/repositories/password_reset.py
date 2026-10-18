from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.password_reset import PasswordResetToken
from app.repositories.base import BaseRepository


class PasswordResetRepository(BaseRepository[PasswordResetToken]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PasswordResetToken)

    async def get_valid_by_hash(self, token_hash: str) -> PasswordResetToken | None:
        now = datetime.now(UTC)
        result = await self.session.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
        )
        return result.scalar_one_or_none()

    async def mark_used(self, token: PasswordResetToken) -> None:
        token.used_at = datetime.now(UTC)
        await self.session.flush()
