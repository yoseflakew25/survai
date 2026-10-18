"""User management use-cases."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError, UnauthorizedError
from app.core.security import hash_password, verify_password
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.repositories.organization import OrganizationRepository
from app.repositories.refresh_token import RefreshTokenRepository
from app.repositories.user import UserRepository
from app.schemas.user import PasswordChangeRequest, UserCreate, UserMeUpdate, UserUpdate

# Soft cap for MVP data-URL avatars (≈300KB binary after base64 overhead)
_MAX_AVATAR_CHARS = 400_000


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.users = UserRepository(session)
        self.organizations = OrganizationRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)

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

        org: Organization | None = None
        if data.organization_name:
            org = Organization(name=data.organization_name.strip())
            await self.organizations.add(org)
            await self.users.session.flush()

        user = User(
            email=data.email.lower().strip(),
            full_name=data.full_name.strip(),
            role=data.role,
            hashed_password=hash_password(data.password),
            organization_id=org.id if org else None,
            is_active=True,
            is_superuser=is_superuser,
        )
        user = await self.users.add(user)
        if org is not None:
            user.organization = org
        await self.users.session.commit()
        return user

    async def update(self, user_id: UUID, data: UserUpdate) -> User:
        user = await self.get(user_id)
        return await self._apply_profile_update(user, data.model_dump(exclude_unset=True))

    async def update_me(self, user: User, data: UserMeUpdate) -> User:
        # Reload with organization relationship
        current = await self.get(user.id)
        return await self._apply_profile_update(current, data.model_dump(exclude_unset=True))

    async def change_password(self, user: User, data: PasswordChangeRequest) -> None:
        current = await self.get(user.id)
        if not verify_password(data.current_password, current.hashed_password):
            raise UnauthorizedError("Current password is incorrect")
        current.hashed_password = hash_password(data.new_password)
        await self.refresh_tokens.revoke_all_for_user(current.id)
        await self.users.session.commit()

    async def delete_me(self, user: User) -> None:
        """Delete the org account login. Org row is kept if other users exist (MVP: 1:1)."""
        current = await self.get(user.id)
        org_id = current.organization_id
        await self.refresh_tokens.revoke_all_for_user(current.id)
        await self.users.session.delete(current)
        await self.users.session.flush()
        if org_id is not None:
            # MVP 1:1 — remove the organization workspace too
            org = await self.organizations.get_by_id(org_id)
            if org is not None:
                await self.users.session.delete(org)
        await self.users.session.commit()

    async def _apply_profile_update(self, user: User, payload: dict) -> User:
        password = payload.pop("password", None)
        org_name_set = "organization_name" in payload
        org_description_set = "organization_description" in payload
        org_website_set = "organization_website" in payload
        organization_name = payload.pop("organization_name", None)
        organization_description = payload.pop("organization_description", None)
        organization_website = payload.pop("organization_website", None)
        avatar_url = payload.get("avatar_url")

        if avatar_url is not None and len(avatar_url) > _MAX_AVATAR_CHARS:
            raise BadRequestError("Avatar image is too large (max ~300KB)")

        for key, value in payload.items():
            if key in {"phone", "job_title", "bio", "avatar_url", "full_name", "role", "is_active"}:
                if isinstance(value, str):
                    value = value.strip() or None if key != "full_name" else value.strip()
                setattr(user, key, value)

        if password:
            user.hashed_password = hash_password(password)

        if (
            org_name_set or org_description_set or org_website_set
        ) and user.organization_id is not None:
            org = user.organization
            if org is None:
                org = await self.organizations.get_by_id(user.organization_id)
            if org is not None:
                if org_name_set and organization_name is not None:
                    org.name = organization_name.strip()
                if org_description_set:
                    text = (organization_description or "").strip()
                    org.description = text or None
                if org_website_set:
                    site = (organization_website or "").strip()
                    org.website = site or None
                user.organization = org

        await self.users.session.commit()
        refreshed = await self.users.get_by_id(user.id)
        assert refreshed is not None
        return refreshed

    async def ensure_first_superuser(self) -> User | None:
        from app.core.config import settings

        existing = await self.users.get_by_email(settings.first_superuser_email)
        if existing:
            if existing.organization_id is None:
                org = Organization(name=settings.first_superuser_organization_name)
                await self.organizations.add(org)
                await self.users.session.flush()
                existing.organization_id = org.id
                existing.organization = org
                if existing.role != UserRole.admin:
                    existing.role = UserRole.admin
                await self.users.session.commit()
            return None
        return await self.create(
            UserCreate(
                email=settings.first_superuser_email,
                password=settings.first_superuser_password,
                full_name=settings.first_superuser_full_name,
                role=UserRole.admin,
                organization_name=settings.first_superuser_organization_name,
            ),
            is_superuser=True,
        )
