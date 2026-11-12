"""Authentication use-cases: login, register+OTP, refresh, logout, password recovery."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, UnauthorizedError
from app.core.geo import normalize_country_code
from app.core.security import (
    create_access_token,
    create_refresh_token_value,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.email_verification import EmailVerificationOtp
from app.models.organization import Organization
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole
from app.repositories.email_verification import EmailVerificationRepository
from app.repositories.organization import OrganizationRepository
from app.repositories.password_reset import PasswordResetRepository
from app.repositories.refresh_token import RefreshTokenRepository
from app.repositories.user import UserRepository
from app.schemas.auth import (
    ForgotPasswordResponse,
    RegisterPendingResponse,
    TokenPairResponse,
)
from app.schemas.user import UserPublic
from app.services.email import (
    EmailDeliveryError,
    email_delivery_configured,
    send_email_verification_otp,
    send_password_reset_otp,
)
from app.services.google_identity import verify_google_id_token


def _generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.organizations = OrganizationRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)
        self.password_resets = PasswordResetRepository(session)
        self.email_otps = EmailVerificationRepository(session)

    async def register(
        self,
        *,
        email: str,
        password: str,
        full_name: str,
        organization_name: str,
    ) -> RegisterPendingResponse:
        """Create org account and send email OTP. Tokens issued only after verify."""
        normalized = email.lower().strip()
        existing = await self.users.get_by_email(normalized)

        if existing and existing.email_verified:
            raise BadRequestError("Email already registered")

        if existing and not existing.email_verified:
            # Allow completing an unfinished signup with updated details.
            display_name = full_name.strip() or organization_name.strip()
            existing.hashed_password = hash_password(password)
            existing.full_name = display_name
            if existing.organization is not None:
                existing.organization.name = organization_name.strip()
            elif existing.organization_id is not None:
                org = await self.organizations.get_by_id(existing.organization_id)
                if org is not None:
                    org.name = organization_name.strip()
                    existing.organization = org
            user = existing
        else:
            org = Organization(name=organization_name.strip())
            await self.organizations.add(org)
            await self.session.flush()

            display_name = full_name.strip() or org.name
            user = User(
                email=normalized,
                hashed_password=hash_password(password),
                full_name=display_name,
                role=UserRole.organization,
                organization_id=org.id,
                is_active=True,
                is_superuser=False,
                email_verified=False,
            )
            await self.users.add(user)
            await self.session.flush()
            user.organization = org

        try:
            code = await self._issue_email_otp(user)
        except EmailDeliveryError as exc:
            await self.session.rollback()
            raise BadRequestError(str(exc)) from exc
        await self.session.commit()
        delivered = email_delivery_configured()
        return RegisterPendingResponse(
            email=user.email,
            message=(
                "Check your email for a verification code."
                if delivered
                else "Email delivery is not configured — use the code shown below (dev)."
            ),
            dev_code=None if delivered else code,
        )

    async def verify_email(self, *, email: str, code: str) -> TokenPairResponse:
        user = await self.users.get_by_email(email)
        if user is None:
            raise BadRequestError("Invalid or expired verification code")
        if user.email_verified:
            # Never mint tokens here — login is the only post-verify auth path.
            raise BadRequestError("Email already verified. Please log in.")
        if not user.is_active:
            raise BadRequestError("Invalid or expired verification code")

        otp = await self.email_otps.get_latest_valid(user.id)
        if otp is None:
            raise BadRequestError("Invalid or expired verification code")

        if otp.attempts >= settings.email_verification_otp_max_attempts:
            await self.email_otps.mark_used(otp)
            await self.session.commit()
            raise BadRequestError("Too many attempts. Request a new code.")

        otp.attempts += 1
        if hash_token(code.strip()) != otp.code_hash:
            await self.session.commit()
            remaining = settings.email_verification_otp_max_attempts - otp.attempts
            if remaining <= 0:
                await self.email_otps.mark_used(otp)
                await self.session.commit()
                raise BadRequestError("Too many attempts. Request a new code.")
            raise BadRequestError("Invalid or expired verification code")

        await self.email_otps.mark_used(otp)
        user.email_verified = True
        await self.session.flush()
        # Reload so UserPublic does not hit expired columns after UPDATE (async SQLite).
        refreshed = await self.users.get_by_id(user.id)
        assert refreshed is not None
        tokens = await self._issue_token_pair(refreshed)
        await self.session.commit()
        return tokens

    async def resend_verification(self, *, email: str) -> RegisterPendingResponse:
        """Resend OTP. Always returns the same message (no email enumeration)."""
        delivered = email_delivery_configured()
        code: str | None = None
        user = await self.users.get_by_email(email)
        if user is not None and user.is_active and not user.email_verified:
            try:
                code = await self._issue_email_otp(user)
            except EmailDeliveryError as exc:
                await self.session.rollback()
                raise BadRequestError(str(exc)) from exc
            await self.session.commit()
        return RegisterPendingResponse(
            email=email.lower().strip(),
            message=(
                "If that email needs verification, a new code has been sent."
                if delivered
                else "Email delivery is not configured — use the code shown below (dev)."
            ),
            # Only echo OTP when mail is not actually delivered (local/dev).
            dev_code=None if delivered else code,
        )

    def _touch_presence(self, user: User, *, country_code: str | None) -> None:
        user.last_seen_at = datetime.now(UTC)
        code = normalize_country_code(country_code)
        if code:
            user.last_country = code

    async def login(
        self, *, email: str, password: str, country_code: str | None = None
    ) -> TokenPairResponse:
        user = await self.users.get_by_email(email)
        if user is None:
            raise UnauthorizedError("Incorrect email or password")
        if not user.hashed_password:
            raise UnauthorizedError(
                "This account uses Google sign-in. Continue with Google."
            )
        if not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Incorrect email or password")
        if not user.is_active:
            raise UnauthorizedError("Inactive user")
        if not user.email_verified:
            raise UnauthorizedError(
                "Email not verified. Check your inbox for a verification code."
            )
        await self._assert_org_active(user)
        self._touch_presence(user, country_code=country_code)
        tokens = await self._issue_token_pair(user)
        await self.session.commit()
        return tokens

    async def login_with_google(
        self, *, credential: str, country_code: str | None = None
    ) -> TokenPairResponse:
        """Verify GIS ID token, find/create org user, issue the same JWT cookies."""
        profile = verify_google_id_token(credential)

        user = await self.users.get_by_google_sub(profile.sub)
        if user is None:
            user = await self.users.get_by_email(profile.email)

        if user is None:
            org_label = profile.full_name or profile.email.split("@", 1)[0]
            org = Organization(name=f"{org_label}'s Organization"[:255])
            await self.organizations.add(org)
            await self.session.flush()

            user = User(
                email=profile.email,
                hashed_password=None,
                google_sub=profile.sub,
                full_name=profile.full_name,
                role=UserRole.organization,
                organization_id=org.id,
                is_active=True,
                is_superuser=False,
                email_verified=True,
                avatar_url=profile.picture_url,
            )
            await self.users.add(user)
            await self.session.flush()
            user.organization = org
        else:
            if not user.is_active:
                raise UnauthorizedError("Inactive user")
            # Link Google subject / refresh verified profile on existing account.
            if user.google_sub and user.google_sub != profile.sub:
                raise BadRequestError(
                    "This email is linked to a different Google account."
                )
            user.google_sub = profile.sub
            user.email_verified = True
            if profile.full_name and (
                not user.full_name or user.full_name == user.email.split("@", 1)[0]
            ):
                user.full_name = profile.full_name
            if profile.picture_url and not user.avatar_url:
                user.avatar_url = profile.picture_url
            if user.organization_id is None:
                org_label = profile.full_name or profile.email.split("@", 1)[0]
                org = Organization(name=f"{org_label}'s Organization"[:255])
                await self.organizations.add(org)
                await self.session.flush()
                user.organization_id = org.id
                user.organization = org

        await self._assert_org_active(user)
        self._touch_presence(user, country_code=country_code)
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
        if not stored.user.email_verified:
            raise UnauthorizedError("Email not verified")

        await self.refresh_tokens.revoke(stored)
        user = await self.users.get_by_id(stored.user_id)
        if user is None:
            raise UnauthorizedError("Invalid refresh token")
        await self._assert_org_active(user)
        tokens = await self._issue_token_pair(user)
        await self.session.commit()
        return tokens

    async def _assert_org_active(self, user: User) -> None:
        if user.role == UserRole.system_admin or user.is_superuser:
            return
        if user.organization_id is None:
            return
        org = await self.organizations.get_by_id(user.organization_id)
        if org is not None and not org.is_active:
            raise UnauthorizedError("Organization suspended")

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

    async def request_password_reset(self, *, email: str) -> ForgotPasswordResponse:
        """Email a 6-digit OTP when the account exists (anti-enumeration).

        Delivery failures are surfaced so the UI does not pretend mail was sent.
        When SMTP/Resend are not configured, return ``dev_code`` for local testing.
        """
        generic = ForgotPasswordResponse()
        user = await self.users.get_by_email(email)
        if user is None or not user.is_active or not user.email_verified:
            return generic

        delivered = email_delivery_configured()
        if not delivered and settings.is_production:
            raise BadRequestError(
                "Password reset email could not be sent. Configure SMTP "
                "or Resend on the API."
            )

        await self.email_otps.invalidate_active_for_user(user.id)
        code = _generate_otp_code()
        otp = EmailVerificationOtp(
            user_id=user.id,
            code_hash=hash_token(code),
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.email_verification_otp_expire_minutes),
            attempts=0,
        )
        await self.email_otps.add(otp)
        await self.session.flush()

        if not delivered:
            await self.session.commit()
            return ForgotPasswordResponse(
                message=(
                    "Email delivery is not configured — use the code shown "
                    "below (dev)."
                ),
                dev_code=code,
            )

        try:
            await send_password_reset_otp(to_email=user.email, code=code)
        except EmailDeliveryError as exc:
            await self.session.rollback()
            detail = str(exc).strip() or "email provider error"
            raise BadRequestError(
                f"Could not send the reset email ({detail}). "
                "Check SMTP settings on the API host."
            ) from exc
        await self.session.commit()
        return generic

    async def confirm_password_reset(
        self, *, email: str, code: str, new_password: str
    ) -> None:
        """Verify reset OTP and set a new password."""
        user = await self.users.get_by_email(email)
        if user is None or not user.is_active or not user.email_verified:
            raise BadRequestError("Invalid or expired reset code")

        otp = await self.email_otps.get_latest_valid(user.id)
        if otp is None:
            raise BadRequestError("Invalid or expired reset code")

        if otp.attempts >= settings.email_verification_otp_max_attempts:
            await self.email_otps.mark_used(otp)
            await self.session.commit()
            raise BadRequestError(
                "Too many incorrect attempts. Request a new reset code."
            )

        otp.attempts += 1
        if hash_token(code.strip()) != otp.code_hash:
            await self.session.commit()
            remaining = settings.email_verification_otp_max_attempts - otp.attempts
            if remaining <= 0:
                await self.email_otps.mark_used(otp)
                await self.session.commit()
                raise BadRequestError(
                    "Too many incorrect attempts. Request a new reset code."
                )
            raise BadRequestError(
                f"Incorrect code. {remaining} attempt"
                f"{'s' if remaining != 1 else ''} remaining."
            )

        await self.email_otps.mark_used(otp)
        user.hashed_password = hash_password(new_password)
        await self.refresh_tokens.revoke_all_for_user(user.id)
        await self.session.commit()

    async def _issue_email_otp(self, user: User) -> str:
        await self.email_otps.invalidate_active_for_user(user.id)
        code = _generate_otp_code()
        otp = EmailVerificationOtp(
            user_id=user.id,
            code_hash=hash_token(code),
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.email_verification_otp_expire_minutes),
            attempts=0,
        )
        await self.email_otps.add(otp)
        await self.session.flush()
        await send_email_verification_otp(to_email=user.email, code=code)
        return code

    async def _issue_token_pair(self, user: User) -> TokenPairResponse:
        # Ensure organization + timestamps are loaded for UserPublic serialization.
        loaded = await self.users.get_by_id(user.id)
        if loaded is None:
            raise UnauthorizedError("Invalid user")
        # Serialize before refresh_tokens.add() flushes — that expire expires
        # other session objects and Pydantic would lazy-load sync (MissingGreenlet).
        public_user = UserPublic.model_validate(loaded)
        access = create_access_token(subject=loaded.id, role=loaded.role.value)
        raw_refresh = create_refresh_token_value()
        refresh_row = RefreshToken(
            user_id=loaded.id,
            token_hash=hash_token(raw_refresh),
            expires_at=datetime.now(UTC)
            + timedelta(days=settings.refresh_token_expire_days),
        )
        await self.refresh_tokens.add(refresh_row)
        return TokenPairResponse(
            access_token=access,
            refresh_token=raw_refresh,
            user=public_user,
        )
