from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import AdminServiceDep, AdminUser
from app.schemas.admin import (
    AdminFeatureFlagsResponse,
    AdminFeatureFlagsUpdate,
    AdminOrgInspectResponse,
    AdminOrgListResponse,
    AdminOrgPublic,
    AdminOrgUpdate,
)

router = APIRouter(prefix="/orgs")


@router.get("", response_model=AdminOrgListResponse)
async def list_orgs(
    _: AdminUser,
    admin: AdminServiceDep,
    search: Annotated[str | None, Query(max_length=200)] = None,
    active: Annotated[bool | None, Query()] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> AdminOrgListResponse:
    return await admin.list_orgs(search=search, active=active, skip=skip, limit=limit)


@router.get("/{org_id}", response_model=AdminOrgPublic)
async def get_org(
    org_id: UUID,
    _: AdminUser,
    admin: AdminServiceDep,
) -> AdminOrgPublic:
    return await admin.get_org(org_id)


@router.patch("/{org_id}", response_model=AdminOrgPublic)
async def update_org(
    org_id: UUID,
    body: AdminOrgUpdate,
    current: AdminUser,
    admin: AdminServiceDep,
) -> AdminOrgPublic:
    return await admin.update_org(actor=current, org_id=org_id, body=body)


@router.get("/{org_id}/feature-flags", response_model=AdminFeatureFlagsResponse)
async def get_feature_flags(
    org_id: UUID,
    _: AdminUser,
    admin: AdminServiceDep,
) -> AdminFeatureFlagsResponse:
    return await admin.get_feature_flags(org_id)


@router.patch("/{org_id}/feature-flags", response_model=AdminFeatureFlagsResponse)
async def update_feature_flags(
    org_id: UUID,
    body: AdminFeatureFlagsUpdate,
    current: AdminUser,
    admin: AdminServiceDep,
) -> AdminFeatureFlagsResponse:
    return await admin.update_feature_flags(
        actor=current, org_id=org_id, flags=body.flags
    )


@router.get("/{org_id}/inspect", response_model=AdminOrgInspectResponse)
async def inspect_org(
    org_id: UUID,
    _: AdminUser,
    admin: AdminServiceDep,
) -> AdminOrgInspectResponse:
    return await admin.inspect_org(org_id)
