"""Pytest fixtures — in-memory SQLite for fast, isolated API tests."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import (  # noqa: F401
    AiGenerationLog,
    EmailVerificationOtp,
    Organization,
    PasswordResetToken,
    RefreshToken,
    SurveyPlan,
    User,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(autouse=True)
def _test_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setattr(settings, "environment", "test")
    monkeypatch.setattr(settings, "smtp_enabled", False)
    monkeypatch.setattr(settings, "cookie_secure", False)
    settings.__dict__.pop("cors_origin_list", None)  # property — no cache


@pytest.fixture
def fixed_otp(monkeypatch: pytest.MonkeyPatch) -> str:
    """Pin registration OTP so verify-email tests don't need log scraping."""
    code = "123456"
    monkeypatch.setattr("app.services.auth._generate_otp_code", lambda: code)
    return code


@pytest_asyncio.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(TEST_DATABASE_URL, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        yield db

    await engine.dispose()


@pytest_asyncio.fixture
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
