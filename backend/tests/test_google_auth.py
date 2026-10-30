"""Google Identity sign-in integrates with existing JWT cookie sessions."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.security import hash_password, verify_password
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.services.google_identity import GoogleIdentityProfile


@pytest.mark.asyncio
async def test_google_sign_in_creates_user_and_session(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.core.config.settings.google_oauth_client_id",
        "test-google-client.apps.googleusercontent.com",
    )

    fake_jwt = "x" * 40

    def _verify(credential: str) -> GoogleIdentityProfile:
        assert credential == fake_jwt
        return GoogleIdentityProfile(
            sub="google-sub-1",
            email="neworg@example.com",
            email_verified=True,
            full_name="New Org",
            picture_url="https://example.com/a.png",
        )

    monkeypatch.setattr(
        "app.services.auth.verify_google_id_token",
        _verify,
    )

    response = await client.post(
        "/api/v1/auth/google",
        json={"credential": fake_jwt},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["user"]["email"] == "neworg@example.com"
    assert body["user"]["email_verified"] is True
    assert body["access_token"]

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "neworg@example.com"


@pytest.mark.asyncio
async def test_google_sign_in_links_existing_password_user(
    client: AsyncClient, session, monkeypatch: pytest.MonkeyPatch
) -> None:
    org = Organization(name="Existing Org")
    session.add(org)
    await session.flush()
    user = User(
        email="existing@example.com",
        full_name="Existing User",
        hashed_password=hash_password("SecurePass1!"),
        role=UserRole.organization,
        is_superuser=False,
        is_active=True,
        email_verified=True,
        organization_id=org.id,
    )
    session.add(user)
    await session.commit()

    def _verify(credential: str) -> GoogleIdentityProfile:
        return GoogleIdentityProfile(
            sub="google-sub-existing",
            email="existing@example.com",
            email_verified=True,
            full_name="Existing User",
            picture_url=None,
        )

    monkeypatch.setattr(
        "app.core.config.settings.google_oauth_client_id",
        "test-google-client.apps.googleusercontent.com",
    )
    monkeypatch.setattr(
        "app.services.auth.verify_google_id_token",
        _verify,
    )

    response = await client.post(
        "/api/v1/auth/google",
        json={"credential": "x" * 40},
    )
    assert response.status_code == 200, response.text

    await session.refresh(user)
    assert user.google_sub == "google-sub-existing"
    assert verify_password("SecurePass1!", user.hashed_password)


@pytest.mark.asyncio
async def test_password_login_blocked_for_google_only_user(
    client: AsyncClient, session
) -> None:
    org = Organization(name="Google Org")
    session.add(org)
    await session.flush()
    session.add(
        User(
            email="googleonly@example.com",
            full_name="Google Only",
            hashed_password=None,
            google_sub="google-sub-only",
            role=UserRole.organization,
            is_superuser=False,
            is_active=True,
            email_verified=True,
            organization_id=org.id,
        )
    )
    await session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "googleonly@example.com", "password": "whatever12"},
    )
    assert response.status_code == 401
    assert "google" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_google_sign_in_requires_config(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.core.config.settings.google_oauth_client_id", "")
    response = await client.post(
        "/api/v1/auth/google",
        json={"credential": "x" * 40},
    )
    assert response.status_code == 400
    assert "not configured" in response.json()["detail"].lower()
