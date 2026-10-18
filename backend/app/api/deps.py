"""FastAPI dependency injection — session, current user, role gates."""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Cookie, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.services.auth import AuthService
from app.services.user import UserService

DbSession = Annotated[AsyncSession, Depends(get_db)]


def get_auth_service(session: DbSession) -> AuthService:
    return AuthService(session)


def get_user_service(session: DbSession) -> UserService:
    return UserService(session)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]


def _extract_bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


async def get_current_user(
    session: DbSession,
    authorization: Annotated[str | None, Header()] = None,
    access_token: Annotated[str | None, Cookie(alias=settings.access_cookie_name)] = None,
) -> User:
    raw = _extract_bearer(authorization) or access_token
    if not raw:
        raise UnauthorizedError()

    try:
        payload = decode_access_token(raw)
        user_id = UUID(str(payload["sub"]))
    except (ValueError, KeyError, TypeError) as exc:
        raise UnauthorizedError() from exc

    user = await UserRepository(session).get_by_id(user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    allowed = set(roles)

    async def _checker(current_user: CurrentUser) -> User:
        if current_user.is_superuser:
            return current_user
        if current_user.role not in allowed:
            raise ForbiddenError()
        return current_user

    return _checker


AdminUser = Annotated[User, Depends(require_roles(UserRole.system_admin))]
