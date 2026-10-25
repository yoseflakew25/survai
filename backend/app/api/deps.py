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
from app.services.analytics import AnalyticsService
from app.services.auth import AuthService
from app.services.collection import CollectionService
from app.services.plan import PlanService
from app.services.report import ReportService
from app.services.respondents import RespondentsService
from app.services.reviewer import ReviewerService
from app.services.survey import SurveyService
from app.services.user import UserService

DbSession = Annotated[AsyncSession, Depends(get_db)]


def get_auth_service(session: DbSession) -> AuthService:
    return AuthService(session)


def get_user_service(session: DbSession) -> UserService:
    return UserService(session)


def get_plan_service(session: DbSession) -> PlanService:
    return PlanService(session)


def get_survey_service(session: DbSession) -> SurveyService:
    return SurveyService(session)


def get_reviewer_service(session: DbSession) -> ReviewerService:
    return ReviewerService(session)


def get_collection_service(session: DbSession) -> CollectionService:
    return CollectionService(session)


def get_analytics_service(session: DbSession) -> AnalyticsService:
    return AnalyticsService(session)


def get_respondents_service(session: DbSession) -> RespondentsService:
    return RespondentsService(session)


def get_report_service(session: DbSession) -> ReportService:
    return ReportService(session)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
PlanServiceDep = Annotated[PlanService, Depends(get_plan_service)]
SurveyServiceDep = Annotated[SurveyService, Depends(get_survey_service)]
ReviewerServiceDep = Annotated[ReviewerService, Depends(get_reviewer_service)]
CollectionServiceDep = Annotated[CollectionService, Depends(get_collection_service)]
AnalyticsServiceDep = Annotated[AnalyticsService, Depends(get_analytics_service)]
RespondentsServiceDep = Annotated[
    RespondentsService, Depends(get_respondents_service)
]
ReportServiceDep = Annotated[ReportService, Depends(get_report_service)]


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
    if user is None or not user.is_active or not user.email_verified:
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
