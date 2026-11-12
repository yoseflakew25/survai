from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Cookie, Response

from app.api.cookies import set_auth_cookies
from app.api.deps import AdminServiceDep, AdminUser, CurrentUser, UserServiceDep
from app.core.config import settings
from app.core.exceptions import BadRequestError, ForbiddenError
from app.core.security import decode_access_token
from app.models.user import UserRole
from app.schemas.admin import AdminImpersonateResponse
from app.schemas.auth import TokenPairResponse
from fastapi import Header

router = APIRouter()

ADMIN_REFRESH_COOKIE = "admin_refresh_token"


def _set_admin_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=ADMIN_REFRESH_COOKIE,
        value=refresh_token,
        max_age=60 * 60,
        httponly=True,
        secure=settings.cookie_secure or settings.is_production,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
        path="/",
    )


def _clear_admin_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=ADMIN_REFRESH_COOKIE,
        path="/",
        domain=settings.cookie_domain,
    )


@router.post("/orgs/{org_id}/impersonate", response_model=AdminImpersonateResponse)
async def start_impersonation(
    org_id: UUID,
    response: Response,
    current: AdminUser,
    admin: AdminServiceDep,
    admin_refresh: Annotated[
        str | None, Cookie(alias=settings.refresh_cookie_name)
    ] = None,
) -> AdminImpersonateResponse:
    # Preserve the admin refresh so /impersonate/stop can restore the session.
    if admin_refresh:
        _set_admin_refresh_cookie(response, admin_refresh)
    result = await admin.start_impersonation(actor=current, org_id=org_id)
    set_auth_cookies(
        response, access_token=result.access_token, refresh_token=result.refresh_token
    )
    return result


@router.post("/impersonate/stop", response_model=TokenPairResponse)
async def stop_impersonation(
    response: Response,
    current: CurrentUser,
    admin: AdminServiceDep,
    users: UserServiceDep,
    authorization: Annotated[str | None, Header()] = None,
    access_cookie: Annotated[
        str | None, Cookie(alias=settings.access_cookie_name)
    ] = None,
    admin_refresh: Annotated[str | None, Cookie(alias=ADMIN_REFRESH_COOKIE)] = None,
) -> TokenPairResponse:
    raw = None
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization.split(" ", 1)[1]
    else:
        raw = access_cookie
    if not raw:
        raise BadRequestError("Not impersonating")

    try:
        payload = decode_access_token(raw)
    except ValueError as exc:
        raise BadRequestError("Invalid session") from exc

    if not payload.get("impersonation"):
        raise BadRequestError("Not currently impersonating")

    impersonator_id = payload.get("impersonator_id")
    if not impersonator_id:
        raise BadRequestError("Missing impersonator")

    admin_user = await users.get(UUID(str(impersonator_id)))
    if admin_user.role != UserRole.system_admin and not admin_user.is_superuser:
        raise ForbiddenError()

    access, refresh, public = await admin.stop_impersonation(actor_admin=admin_user)
    _clear_admin_refresh_cookie(response)
    set_auth_cookies(response, access_token=access, refresh_token=refresh)
    # admin_refresh cookie is optional backup; new tokens already issued for admin.
    _ = admin_refresh
    _ = current
    return TokenPairResponse(
        access_token=access, refresh_token=refresh, user=public
    )
