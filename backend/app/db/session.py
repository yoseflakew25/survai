"""Async SQLAlchemy engine and session factory."""

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.ssl_utils import build_database_ssl_context


def _engine_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "echo": settings.database_echo,
        "pool_pre_ping": True,
        "pool_size": settings.database_pool_size,
        "max_overflow": settings.database_max_overflow,
    }
    if settings.database_ssl:
        kwargs["connect_args"] = {
            "ssl": build_database_ssl_context(settings.database_ssl_ca),
        }
    return kwargs


engine = create_async_engine(settings.database_url, **_engine_kwargs())

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a request-scoped session. Callers / services commit explicitly."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
