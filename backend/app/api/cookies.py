"""Set / clear auth cookies (JWT access + opaque refresh)."""

from __future__ import annotations

from fastapi import Response

from app.core.config import settings


def set_auth_cookies(response: Response, *, access_token: str, refresh_token: str) -> None:
    common = {
        "httponly": True,
        "secure": settings.cookie_secure or settings.is_production,
        "samesite": settings.cookie_samesite,
        "domain": settings.cookie_domain,
        "path": "/",
    }
    response.set_cookie(
        key=settings.access_cookie_name,
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        **common,
    )
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        **common,
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        key=settings.access_cookie_name,
        path="/",
        domain=settings.cookie_domain,
    )
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path="/",
        domain=settings.cookie_domain,
    )
