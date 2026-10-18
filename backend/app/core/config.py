"""Application settings loaded from environment variables."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "SurvAI API"
    environment: Literal["development", "staging", "production", "test"] = "development"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False

    # CORS — comma-separated origins, e.g. http://localhost:3000
    cors_origins: str = "http://localhost:3000"

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://survai:survai@localhost:5432/survai",
        description="Async SQLAlchemy URL (use postgresql+asyncpg://…)",
    )
    # Required for managed providers (Aiven, Neon, etc.)
    database_ssl: bool = False
    # Optional path to provider CA PEM (Aiven “CA certificate”). If unset with
    # database_ssl=true, connects like libpq sslmode=require (encrypt, no verify).
    database_ssl_ca: str | None = None
    # Keep well under provider connection limits (Aiven free ≈ 20)
    database_pool_size: int = 5
    database_max_overflow: int = 5

    # JWT / cookies
    jwt_secret_key: str = Field(default="CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 14
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str | None = None
    access_cookie_name: str = "access_token"
    refresh_cookie_name: str = "refresh_token"

    # Password reset
    password_reset_token_expire_minutes: int = 60
    frontend_url: str = "http://localhost:3000"
    password_reset_path: str = "/auth/reset-password"

    # Email (SMTP) — optional in development; logged to console when disabled
    smtp_enabled: bool = False
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_tls: bool = False
    emails_from_email: str = "noreply@example.com"
    emails_from_name: str = "SurvAI"

    # First superuser (created on startup if missing)
    # Use a real TLD — EmailStr rejects reserved names like .local
    first_superuser_email: str = "admin@example.com"
    first_superuser_password: str = "ChangeMe123!"
    first_superuser_full_name: str = "SurvAI Admin"
    first_superuser_organization_name: str = "SurvAI"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def strip_origins(cls, value: object) -> object:
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def password_reset_url_base(self) -> str:
        return f"{self.frontend_url.rstrip('/')}{self.password_reset_path}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
