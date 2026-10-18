"""User management use-cases."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.users = UserRepository(session)

    async def get(self, user_id: UUID) -> User:
        user = await self.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        return user

    async def list_users(self, *, skip: int = 0, limit: int = 100) -> list[User]:
        return await self.users.list(skip=skip, limit=limit)

    async def create(self, data: UserCreate, *, is_superuser: bool = False) -> User:
        if await self.users.get_by_email(data.email):
            raise ConflictError("Email already registered")
        user = User(
            email=data.email.lower().strip(),
            full_name=data.full_name.strip(),
            role=data.role,
            hashed_password=hash_password(data.password),
            is_active=True,
            is_superuser=is_superuser,
        )
        user = await self.users.add(user)
        await self.users.session.commit()
        return user

    async def update(self, user_id: UUID, data: UserUpdate) -> User:
        user = await self.get(user_id)
        payload = data.model_dump(exclude_unset=True)
        password = payload.pop("password", None)
        for key, value in payload.items():
            setattr(user, key, value)
        if password:
            user.hashed_password = hash_password(password)
        await self.users.session.commit()
        await self.users.session.refresh(user)
        return user

    async def ensure_first_superuser(self) -> User | None:
        from app.core.config import settings

        existing = await self.users.get_by_email(settings.first_superuser_email)
        if existing:
            return None
        return await self.create(
            UserCreate(
                email=settings.first_superuser_email,
                password=settings.first_superuser_password,
                full_name=settings.first_superuser_full_name,
                role=UserRole.admin,
            ),
            is_superuser=True,
        )
