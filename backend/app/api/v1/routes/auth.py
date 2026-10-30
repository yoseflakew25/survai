"""Auth routes — login/register/OTP verify/refresh/logout + password recovery.

Tokens are returned in the JSON body *and* set as httpOnly cookies so the
Next.js frontend can use either pattern (Bearer header or credentialed cookies).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Cookie, Response, status

from app.api.cookies import clear_auth_cookies, set_auth_cookies
from app.api.deps import AuthServiceDep, CurrentUser
from app.core.config import settings
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    GoogleAuthRequest,
    LoginRequest,
    MessageResponse,
    PasswordResetConfirm,
    RefreshRequest,
    RegisterPendingResponse,
    RegisterRequest,
    ResendVerificationRequest,
    TokenPairResponse,
    VerifyEmailRequest,
)
from app.schemas.user import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=RegisterPendingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    body: RegisterRequest,
    auth: AuthServiceDep,
) -> RegisterPendingResponse:
    return await auth.register(
        email=body.email,
        password=body.password,
        full_name=body.full_name or body.organization_name,
        organization_name=body.organization_name,
    )


@router.post("/verify-email", response_model=TokenPairResponse)
async def verify_email(
    body: VerifyEmailRequest,
    response: Response,
    auth: AuthServiceDep,
) -> TokenPairResponse:
    tokens = await auth.verify_email(email=body.email, code=body.code)
    set_auth_cookies(
        response, access_token=tokens.access_token, refresh_token=tokens.refresh_token
    )
    return tokens


@router.post("/resend-verification", response_model=RegisterPendingResponse)
async def resend_verification(
    body: ResendVerificationRequest,
    auth: AuthServiceDep,
) -> RegisterPendingResponse:
    return await auth.resend_verification(email=body.email)


@router.post("/login", response_model=TokenPairResponse)
async def login(
    body: LoginRequest,
    response: Response,
    auth: AuthServiceDep,
) -> TokenPairResponse:
    tokens = await auth.login(email=body.email, password=body.password)
    set_auth_cookies(
        response, access_token=tokens.access_token, refresh_token=tokens.refresh_token
    )
    return tokens


@router.post("/google", response_model=TokenPairResponse)
async def google_sign_in(
    body: GoogleAuthRequest,
    response: Response,
    auth: AuthServiceDep,
) -> TokenPairResponse:
    """Exchange a Google Identity Services ID token for SurvAI session cookies."""
    tokens = await auth.login_with_google(credential=body.credential)
    set_auth_cookies(
        response, access_token=tokens.access_token, refresh_token=tokens.refresh_token
    )
    return tokens


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh(
    response: Response,
    auth: AuthServiceDep,
    body: RefreshRequest | None = None,
    refresh_token: Annotated[
        str | None, Cookie(alias=settings.refresh_cookie_name)
    ] = None,
) -> TokenPairResponse:
    raw = (body.refresh_token if body else None) or refresh_token
    if not raw:
        from app.core.exceptions import UnauthorizedError

        raise UnauthorizedError("Missing refresh token")
    tokens = await auth.refresh(raw_refresh_token=raw)
    set_auth_cookies(
        response, access_token=tokens.access_token, refresh_token=tokens.refresh_token
    )
    return tokens


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    auth: AuthServiceDep,
    body: RefreshRequest | None = None,
    refresh_token: Annotated[
        str | None, Cookie(alias=settings.refresh_cookie_name)
    ] = None,
) -> MessageResponse:
    raw = (body.refresh_token if body else None) or refresh_token
    await auth.logout(raw_refresh_token=raw)
    clear_auth_cookies(response)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserPublic)
async def me(current_user: CurrentUser) -> UserPublic:
    return UserPublic.model_validate(current_user)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    auth: AuthServiceDep,
) -> ForgotPasswordResponse:
    return await auth.request_password_reset(email=body.email)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    body: PasswordResetConfirm,
    auth: AuthServiceDep,
) -> MessageResponse:
    await auth.confirm_password_reset(token=body.token, new_password=body.new_password)
    return MessageResponse(message="Password updated successfully")
