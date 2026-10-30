"""Verify Google Identity Services (GIS) ID tokens."""

from __future__ import annotations

from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import settings
from app.core.exceptions import BadRequestError, UnauthorizedError


@dataclass(frozen=True, slots=True)
class GoogleIdentityProfile:
    sub: str
    email: str
    email_verified: bool
    full_name: str
    picture_url: str | None


def verify_google_id_token(credential: str) -> GoogleIdentityProfile:
    """Validate a GIS credential JWT and return the profile claims.

    Raises UnauthorizedError / BadRequestError on failure.
    """
    client_id = (settings.google_oauth_client_id or "").strip()
    if not client_id:
        raise BadRequestError("Google sign-in is not configured on this API.")

    raw = (credential or "").strip()
    if not raw:
        raise BadRequestError("Missing Google credential")

    try:
        claims = id_token.verify_oauth2_token(
            raw,
            google_requests.Request(),
            audience=client_id,
        )
    except ValueError as exc:
        raise UnauthorizedError("Invalid Google credential") from exc

    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise UnauthorizedError("Invalid Google credential issuer")

    sub = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").lower().strip()
    if not sub or not email:
        raise UnauthorizedError("Google account is missing email")

    email_verified = bool(claims.get("email_verified"))
    if not email_verified:
        raise UnauthorizedError("Google email is not verified")

    full_name = (
        str(claims.get("name") or "").strip()
        or str(claims.get("given_name") or "").strip()
        or email.split("@", 1)[0]
    )
    picture = claims.get("picture")
    picture_url = str(picture).strip() if picture else None

    return GoogleIdentityProfile(
        sub=sub,
        email=email,
        email_verified=email_verified,
        full_name=full_name[:255],
        picture_url=picture_url,
    )
