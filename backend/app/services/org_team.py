"""Org team members + email invites."""

from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.core.rbac import INVITEABLE_ROLES, require_org_owner
from app.core.security import hash_password, hash_token
from app.models.org_invite import OrgInvite
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.schemas.auth import TokenPairResponse
from app.schemas.org import (
    AcceptInviteRequest,
    OrgInviteCreate,
    OrgInviteCreateResponse,
    OrgInvitePublic,
    OrgMemberPublic,
    OrgTeamResponse,
)
from app.services.auth import AuthService
from app.services.email import email_delivery_configured, send_org_invite_email

logger = logging.getLogger(__name__)

_INVITE_TTL_DAYS = 7


class OrgTeamService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.auth = AuthService(session)

    async def list_team(self, *, user: User) -> OrgTeamResponse:
        require_org_owner(user)
        assert user.organization_id is not None
        org_id = user.organization_id

        members_result = await self.session.execute(
            select(User)
            .where(User.organization_id == org_id)
            .order_by(User.created_at.asc())
        )
        members = [
            OrgMemberPublic.model_validate(m) for m in members_result.scalars().all()
        ]

        invites_result = await self.session.execute(
            select(OrgInvite)
            .where(
                OrgInvite.organization_id == org_id,
                OrgInvite.accepted_at.is_(None),
            )
            .order_by(OrgInvite.created_at.desc())
        )
        invites = [
            OrgInvitePublic.model_validate(i) for i in invites_result.scalars().all()
        ]
        return OrgTeamResponse(members=members, invites=invites)

    async def create_invite(
        self, *, user: User, body: OrgInviteCreate
    ) -> OrgInviteCreateResponse:
        require_org_owner(user)
        assert user.organization_id is not None
        org_id = user.organization_id
        email = str(body.email).strip().lower()
        role = UserRole(body.role)
        if role not in INVITEABLE_ROLES:
            raise BadRequestError("Invite role must be researcher or viewer")

        existing = await self.users.get_by_email(email)
        if existing is not None:
            if existing.organization_id == org_id:
                raise ConflictError("That person is already on your team")
            raise ConflictError("That email already has a SurvAI account")

        pending = await self.session.execute(
            select(OrgInvite).where(
                OrgInvite.organization_id == org_id,
                OrgInvite.email == email,
                OrgInvite.accepted_at.is_(None),
            )
        )
        old = pending.scalar_one_or_none()
        if old is not None:
            await self.session.delete(old)
            await self.session.flush()

        raw = secrets.token_urlsafe(32)
        invite = OrgInvite(
            organization_id=org_id,
            email=email,
            role=role.value,
            token_hash=hash_token(raw),
            invited_by=user.id,
            expires_at=datetime.now(UTC) + timedelta(days=_INVITE_TTL_DAYS),
        )
        self.session.add(invite)
        await self.session.commit()
        await self.session.refresh(invite)

        org = await self.session.get(Organization, org_id)
        org_name = org.name if org is not None else "your organization"
        invite_url = (
            f"{settings.frontend_url.rstrip('/')}/auth/accept-invite?token={raw}"
        )
        # Keep the invite even if outbound mail fails — return the accept
        # link so the owner can share it manually (Team UI toast).
        delivered = False
        if email_delivery_configured():
            try:
                await send_org_invite_email(
                    to_email=email,
                    org_name=org_name,
                    role=role.value,
                    invite_url=invite_url,
                    invited_by_name=user.full_name,
                )
                delivered = True
            except Exception:
                logger.exception("org invite email failed for %s", email)
        else:
            logger.info(
                "Invite email skipped (no SMTP/Resend) — share link for %s", email
            )

        return OrgInviteCreateResponse(
            invite=OrgInvitePublic.model_validate(invite),
            # Include link when mail is off or failed so demos never 500.
            dev_invite_url=None if delivered else invite_url,
        )

    async def revoke_invite(self, *, user: User, invite_id: UUID) -> None:
        require_org_owner(user)
        assert user.organization_id is not None
        invite = await self.session.get(OrgInvite, invite_id)
        if (
            invite is None
            or invite.organization_id != user.organization_id
            or invite.accepted_at is not None
        ):
            raise NotFoundError("Invite not found")
        await self.session.delete(invite)
        await self.session.commit()

    async def remove_member(self, *, user: User, member_id: UUID) -> None:
        require_org_owner(user)
        assert user.organization_id is not None
        if member_id == user.id:
            raise BadRequestError("You cannot remove yourself")
        member = await self.users.get_by_id(member_id)
        if member is None or member.organization_id != user.organization_id:
            raise NotFoundError("Member not found")
        if member.role == UserRole.organization:
            raise BadRequestError("Cannot remove the organization owner")
        member.is_active = False
        member.organization_id = None
        await self.session.commit()

    async def accept_invite(self, *, body: AcceptInviteRequest) -> TokenPairResponse:
        token_h = hash_token(body.token.strip())
        result = await self.session.execute(
            select(OrgInvite).where(OrgInvite.token_hash == token_h)
        )
        invite = result.scalar_one_or_none()
        if invite is None or invite.accepted_at is not None:
            raise BadRequestError("Invalid or already used invite")
        expires = invite.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        if expires < datetime.now(UTC):
            raise BadRequestError("This invite has expired")

        email = invite.email.lower()
        existing = await self.users.get_by_email(email)
        if existing is not None:
            raise ConflictError("An account with this email already exists — sign in instead")

        role = UserRole(invite.role)
        user = User(
            email=email,
            full_name=body.full_name.strip(),
            hashed_password=hash_password(body.password),
            role=role,
            organization_id=invite.organization_id,
            is_active=True,
            is_superuser=False,
            email_verified=True,
        )
        self.session.add(user)
        invite.accepted_at = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(user)
        return await self.auth._issue_token_pair(user)  # noqa: SLF001
