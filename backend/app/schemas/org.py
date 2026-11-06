"""Org team / invite schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

InviteRole = Literal["researcher", "viewer"]


class OrgMemberPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime


class OrgInviteCreate(BaseModel):
    email: EmailStr
    role: InviteRole = "researcher"


class OrgInvitePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    role: str
    expires_at: datetime
    accepted_at: datetime | None = None
    created_at: datetime


class OrgInviteCreateResponse(BaseModel):
    invite: OrgInvitePublic
    # Present only when outbound email is not configured (local/dev).
    dev_invite_url: str | None = None


class OrgTeamResponse(BaseModel):
    members: list[OrgMemberPublic]
    invites: list[OrgInvitePublic]


class AcceptInviteRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)
