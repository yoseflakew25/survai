"""Org team members and invites (Owner only for mutate)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Response, status

from app.api.cookies import set_auth_cookies
from app.api.deps import CurrentUser, OrgTeamServiceDep
from app.schemas.auth import TokenPairResponse
from app.schemas.org import (
    AcceptInviteRequest,
    OrgInviteCreate,
    OrgInviteCreateResponse,
    OrgTeamResponse,
)

router = APIRouter(tags=["org"])


@router.get("/org/team", response_model=OrgTeamResponse)
async def get_team(
    current_user: CurrentUser,
    team: OrgTeamServiceDep,
) -> OrgTeamResponse:
    return await team.list_team(user=current_user)


@router.post(
    "/org/invites",
    response_model=OrgInviteCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_invite(
    body: OrgInviteCreate,
    current_user: CurrentUser,
    team: OrgTeamServiceDep,
) -> OrgInviteCreateResponse:
    return await team.create_invite(user=current_user, body=body)


@router.delete("/org/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_invite(
    invite_id: UUID,
    current_user: CurrentUser,
    team: OrgTeamServiceDep,
) -> Response:
    await team.revoke_invite(user=current_user, invite_id=invite_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/org/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    member_id: UUID,
    current_user: CurrentUser,
    team: OrgTeamServiceDep,
) -> Response:
    await team.remove_member(user=current_user, member_id=member_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/auth/accept-invite", response_model=TokenPairResponse)
async def accept_invite(
    body: AcceptInviteRequest,
    response: Response,
    team: OrgTeamServiceDep,
) -> TokenPairResponse:
    tokens = await team.accept_invite(body=body)
    set_auth_cookies(
        response, access_token=tokens.access_token, refresh_token=tokens.refresh_token
    )
    return tokens
