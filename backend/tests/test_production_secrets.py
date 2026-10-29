"""Production secret enforcement + bootstrap password must not reset on boot."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.security import hash_password, verify_password
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.services.user import UserService


def _clear_settings_cache() -> None:
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def _reset_settings_cache() -> None:
    _clear_settings_cache()
    yield
    _clear_settings_cache()


def test_production_rejects_default_jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND")
    monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "a-strong-bootstrap-pw")
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        Settings(_env_file=None)


def test_production_rejects_short_jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "too-short-to-be-safe")
    monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "a-strong-bootstrap-pw")
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        Settings(_env_file=None)


def test_production_rejects_default_bootstrap_password(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv(
        "JWT_SECRET_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef"
    )
    monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "12121212")
    with pytest.raises(ValidationError, match="FIRST_SUPERUSER_PASSWORD"):
        Settings(_env_file=None)


def test_production_accepts_strong_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv(
        "JWT_SECRET_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef"
    )
    monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "a-strong-bootstrap-pw")
    cfg = Settings(_env_file=None)
    assert cfg.environment == "production"


def test_development_allows_default_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("JWT_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND")
    monkeypatch.setenv("FIRST_SUPERUSER_PASSWORD", "12121212")
    cfg = Settings(_env_file=None)
    assert cfg.environment == "development"


@pytest.mark.asyncio
async def test_bootstrap_does_not_reset_existing_admin_password(
    session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.core.config.settings.first_superuser_email", "admin@example.com"
    )
    monkeypatch.setattr(
        "app.core.config.settings.first_superuser_password", "env-password-should-not-apply"
    )
    monkeypatch.setattr(
        "app.core.config.settings.first_superuser_full_name", "SurvAI System Admin"
    )
    monkeypatch.setattr(
        "app.core.config.settings.first_superuser_organization_name", "SurvAI"
    )

    org = Organization(name="SurvAI")
    session.add(org)
    await session.flush()

    original = "original-admin-password"
    admin = User(
        email="admin@example.com",
        full_name="SurvAI System Admin",
        hashed_password=hash_password(original),
        role=UserRole.system_admin,
        is_superuser=True,
        is_active=True,
        email_verified=True,
        organization_id=org.id,
    )
    session.add(admin)
    await session.commit()

    service = UserService(session)
    created = await service.ensure_first_superuser()
    assert created is None

    await session.refresh(admin)
    assert verify_password(original, admin.hashed_password)
    assert not verify_password("env-password-should-not-apply", admin.hashed_password)
