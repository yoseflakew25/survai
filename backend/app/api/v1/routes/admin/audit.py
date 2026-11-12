from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import AdminServiceDep, AdminUser
from app.schemas.admin import AdminAuditListResponse

router = APIRouter()


@router.get("/audit-log", response_model=AdminAuditListResponse)
async def list_audit(
    _: AdminUser,
    admin: AdminServiceDep,
    organization_id: Annotated[UUID | None, Query()] = None,
    actor_user_id: Annotated[UUID | None, Query()] = None,
    action: Annotated[str | None, Query(max_length=128)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> AdminAuditListResponse:
    return await admin.list_audit(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=action,
        skip=skip,
        limit=limit,
    )
