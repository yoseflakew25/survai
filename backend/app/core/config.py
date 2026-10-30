"""Application settings loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Literal, Self

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env regardless of process cwd (uvicorn reload / IDE launch).
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _BACKEND_ROOT / ".env"

# Rejected when ENVIRONMENT=production (placeholders / common weak values).
_INSECURE_JWT_SECRETS = frozenset(
    s.lower()
    for s in (
        "CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND",
        "dev-change-me-use-openssl-rand-hex-32",
        "replace-with-openssl-rand-hex-64",
        "REPLACE_WITH_OPENSSL_RAND_HEX_32",
        "secret",
        "changeme",
        "jwt-secret",
        "your-secret-key",
    )
)
_INSECURE_BOOTSTRAP_PASSWORDS = frozenset(
    s.lower()
    for s in (
        "12121212",
        "replace-with-strong-password",
        "password",
        "password123",
        "changeme",
        "admin",
        "admin123",
        "survai",
        "survai123",
    )
)
_MIN_PROD_JWT_SECRET_LEN = 32
_MIN_PROD_BOOTSTRAP_PASSWORD_LEN = 12


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
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

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        """Railway/Neon often give postgres:// or postgresql:// — asyncpg needs +asyncpg."""
        if not isinstance(value, str) or not value:
            return value
        url = value.strip()
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        if url.startswith("postgresql://") and not url.startswith(
            "postgresql+asyncpg://"
        ):
            url = "postgresql+asyncpg://" + url[len("postgresql://") :]
        return url
    # Required for managed providers (Aiven, Neon, etc.)
    database_ssl: bool = False
    # Optional path to provider CA PEM (Aiven “CA certificate”). If unset with
    # database_ssl=true, connects like libpq sslmode=require (encrypt, no verify).
    database_ssl_ca: str | None = None
    # Keep well under provider connection limits (Aiven free ≈ 20)
    database_pool_size: int = 5
    database_max_overflow: int = 5
    # SQLAlchemy engine echo — off by default (DEBUG=true alone used to dump
    # every query and add noticeable latency over remote DBs like Aiven).
    database_echo: bool = False

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

    # Email verification OTP (registration)
    email_verification_otp_expire_minutes: int = 10
    email_verification_otp_max_attempts: int = 5

    # Email — prefer Resend (RESEND_API_KEY). Fallback: SMTP when smtp_enabled=true.
    # If neither is set, OTP is only logged to the API console (dev).
    resend_api_key: str = ""
    smtp_enabled: bool = False
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_tls: bool = True
    emails_from_email: str = "onboarding@resend.dev"
    emails_from_name: str = "SurvAI"

    # Google Identity (GIS) — Web client ID from Google Cloud Console.
    # Empty disables POST /auth/google. Same value as NEXT_PUBLIC_GOOGLE_CLIENT_ID.
    google_oauth_client_id: str = ""

    # First system admin (created on startup if missing; password never re-synced)
    # Use a real TLD — EmailStr rejects reserved names like .local
    first_superuser_email: str = "yoseflakewdev@gmail.com"
    first_superuser_password: str = "12121212"
    first_superuser_full_name: str = "SurvAI System Admin"
    first_superuser_organization_name: str = "SurvAI"

    @model_validator(mode="after")
    def enforce_production_secrets(self) -> Self:
        """Fail fast in production when JWT / bootstrap password are weak."""
        if self.environment != "production":
            return self

        errors: list[str] = []
        secret = self.jwt_secret_key.strip()
        if len(secret) < _MIN_PROD_JWT_SECRET_LEN or secret.lower() in _INSECURE_JWT_SECRETS:
            errors.append(
                "JWT_SECRET_KEY must be a strong random value "
                f"(≥{_MIN_PROD_JWT_SECRET_LEN} chars); "
                "generate with: openssl rand -hex 32"
            )

        password = self.first_superuser_password
        if (
            len(password) < _MIN_PROD_BOOTSTRAP_PASSWORD_LEN
            or password.lower() in _INSECURE_BOOTSTRAP_PASSWORDS
        ):
            errors.append(
                "FIRST_SUPERUSER_PASSWORD must be strong "
                f"(≥{_MIN_PROD_BOOTSTRAP_PASSWORD_LEN} chars) and not a "
                "default/placeholder value"
            )

        if errors:
            raise ValueError("; ".join(errors))
        return self

    # AI — Gemini behind app/ai/client.py (never call the vendor from routes)
    ai_provider: Literal["gemini"] = "gemini"
    gemini_api_key: str = ""
    gemini_model_planner: str = "gemini-3.1-flash-lite"
    gemini_model_builder: str = "gemini-3.1-flash-lite"
    gemini_model_reviewer: str = "gemini-3.1-flash-lite"
    gemini_model_report: str = "gemini-3.1-flash-lite"
    gemini_model_chat: str = "gemini-3.1-flash-lite"
    # Comma-separated fallbacks tried on 429/503 (quota / high demand).
    gemini_model_fallbacks: str = (
        "gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.5-flash"
    )

    # ARQ / Redis — empty disables the queue and runs jobs inline
    redis_url: str = ""

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
