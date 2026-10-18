"""Authentication use-cases: login, refresh, logout, password recovery."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token_value,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.organization import Organization
from app.models.password_reset import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole
from app.repositories.organization import OrganizationRepository
from app.repositories.password_reset import PasswordResetRepository
from app.repositories.refresh_token import RefreshTokenRepository
from app.repositories.user import UserRepository
from app.schemas.auth import TokenPairResponse
from app.schemas.user import UserPublic
from app.services.email import send_password_reset_email


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.organizations = OrganizationRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)
        self.password_resets = PasswordResetRepository(session)

    async def register(
        self,
        *,
        email: str,
        password: str,
        full_name: str,
        organization_name: str,
    ) -> TokenPairResponse:
        existing = await self.users.get_by_email(email)
        if existing:
            raise BadRequestError("Email already registered")

        org = Organization(name=organization_name.strip())
        await self.organizations.add(org)
        await self.session.flush()

        # MVP: one login per organization (no staff seats).
        display_name = full_name.strip() or org.name
        user = User(
            email=email.lower().strip(),
            hashed_password=hash_password(password),
            full_name=display_name,
            role=UserRole.organization,
            organization_id=org.id,
            is_active=True,
            is_superuser=False,
        )
        await self.users.add(user)
        await self.session.flush()
        # Ensure relationship is available for UserPublic
        user.organization = org
        tokens = await self._issue_token_pair(user)
        await self.session.commit()
        return tokens

    async def login(self, *, email: str, password: str) -> TokenPairResponse:
        user = await self.users.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Incorrect email or password")
        if not user.is_active:
            raise UnauthorizedError("Inactive user")
        tokens = await self._issue_token_pair(user)
        await self.session.commit()
        return tokens

    async def refresh(self, *, raw_refresh_token: str) -> TokenPairResponse:
        token_hash = hash_token(raw_refresh_token)
        stored = await self.refresh_tokens.get_valid_by_hash(token_hash)
        if stored is None or stored.user is None:
            raise UnauthorizedError("Invalid refresh token")
        if not stored.user.is_active:
            raise UnauthorizedError("Inactive user")

        await self.refresh_tokens.revoke(stored)
        # Reload with organization for response
        user = await self.users.get_by_id(stored.user_id)
        if user is None:
            raise UnauthorizedError("Invalid refresh token")
        tokens = await self._issue_token_pair(user)
        await self.session.commit()
        return tokens

    async def logout(self, *, raw_refresh_token: str | None) -> None:
        if not raw_refresh_token:
            return
        stored = await self.refresh_tokens.get_valid_by_hash(hash_token(raw_refresh_token))
        if stored:
            await self.refresh_tokens.revoke(stored)
            await self.session.commit()

    async def logout_all(self, *, user_id: UUID) -> None:
        await self.refresh_tokens.revoke_all_for_user(user_id)
        await self.session.commit()

    async def request_password_reset(self, *, email: str) -> None:
        """Always succeeds from the caller's perspective (no email enumeration)."""
        user = await self.users.get_by_email(email)
        if user is None or not user.is_active:
            return

        raw_token = secrets.token_urlsafe(32)
        reset = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.password_reset_token_expire_minutes),
        )
        await self.password_resets.add(reset)
        await self.session.commit()
        await send_password_reset_email(to_email=user.email, reset_token=raw_token)

    async def confirm_password_reset(self, *, token: str, new_password: str) -> None:
        stored = await self.password_resets.get_valid_by_hash(hash_token(token))
        if stored is None:
            raise BadRequestError("Invalid or expired reset token")

        user = await self.users.get_by_id(stored.user_id)
        if user is None or not user.is_active:
            raise BadRequestError("Invalid or expired reset token")

        user.hashed_password = hash_password(new_password)
        await self.password_resets.mark_used(stored)
        await self.refresh_tokens.revoke_all_for_user(user.id)
        await self.session.commit()

    async def _issue_token_pair(self, user: User) -> TokenPairResponse:
        access = create_access_token(subject=user.id, role=user.role.value)
        raw_refresh = create_refresh_token_value()
        refresh_row = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh),
            expires_at=datetime.now(UTC)
            + timedelta(days=settings.refresh_token_expire_days),
        )
        await self.refresh_tokens.add(refresh_row)
        return TokenPairResponse(
            access_token=access,
            refresh_token=raw_refresh,
            user=UserPublic.model_validate(user),
        )
