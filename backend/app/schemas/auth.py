from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserPublic


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    # Optional contact label; defaults to organization_name when omitted.
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    # Creates the Organization account (workspace). MVP: no staff invites.
    # Respondents never register — they only fill public forms.
    organization_name: str = Field(min_length=1, max_length=255)


class RegisterPendingResponse(BaseModel):
    """Returned after signup — account exists but email OTP must be verified."""

    email: EmailStr
    message: str = "Check your email for a verification code."
    # Only set when outbound email is not configured (dev). Never in production with SMTP/Resend.
    dev_code: str | None = None


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic


class RefreshRequest(BaseModel):
    """Optional body fallback when the refresh cookie is absent."""

    refresh_token: str | None = None


class MessageResponse(BaseModel):
    message: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)
