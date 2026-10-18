from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.organization


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    organization_name: str | None = Field(default=None, min_length=1, max_length=255)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=32)
    job_title: str | None = Field(default=None, max_length=100)
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = None
    organization_name: str | None = Field(default=None, min_length=1, max_length=255)


class UserMeUpdate(BaseModel):
    """Self-service profile update for the logged-in org account."""

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    job_title: str | None = Field(default=None, max_length=100)
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = None
    organization_name: str | None = Field(default=None, min_length=1, max_length=255)
    organization_description: str | None = Field(default=None, max_length=2000)
    organization_website: str | None = Field(default=None, max_length=255)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    is_superuser: bool
    email_verified: bool = False
    organization_id: UUID | None = None
    organization_name: str | None = None
    organization_description: str | None = None
    organization_website: str | None = None
    phone: str | None = None
    job_title: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def embed_organization(cls, data: Any) -> Any:
        """Pull org fields from the ORM relationship when present."""
        if hasattr(data, "organization"):
            org = getattr(data, "organization", None)
            return {
                "id": data.id,
                "email": data.email,
                "full_name": data.full_name,
                "role": data.role,
                "is_active": data.is_active,
                "is_superuser": data.is_superuser,
                "email_verified": data.email_verified,
                "organization_id": data.organization_id,
                "organization_name": org.name if org is not None else None,
                "organization_description": org.description if org is not None else None,
                "organization_website": org.website if org is not None else None,
                "phone": data.phone,
                "job_title": data.job_title,
                "bio": data.bio,
                "avatar_url": data.avatar_url,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data
