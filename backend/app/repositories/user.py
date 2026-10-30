from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, User)

    async def get_by_id(self, id: UUID) -> User | None:
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.organization))
            .where(User.id == id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.organization))
            .where(User.email == email.lower().strip())
        )
        return result.scalar_one_or_none()

    async def get_by_google_sub(self, google_sub: str) -> User | None:
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.organization))
            .where(User.google_sub == google_sub)
        )
        return result.scalar_one_or_none()

    async def count_by_organization(self, organization_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(User)
            .where(User.organization_id == organization_id)
        )
        return int(result.scalar_one())

    async def list_active_by_organization(
        self, organization_id: UUID
    ) -> list[User]:
        result = await self.session.execute(
            select(User).where(
                User.organization_id == organization_id,
                User.is_active.is_(True),
                User.email_verified.is_(True),
            )
        )
        return list(result.scalars().all())
