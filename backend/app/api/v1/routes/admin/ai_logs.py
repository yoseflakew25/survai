from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import AdminServiceDep, AdminUser
from app.schemas.admin import AdminAiLogListResponse

router = APIRouter()


@router.get("/ai-logs", response_model=AdminAiLogListResponse)
async def list_ai_logs(
    _: AdminUser,
    admin: AdminServiceDep,
    feature: Annotated[str | None, Query(max_length=64)] = None,
    status: Annotated[str | None, Query(max_length=64)] = None,
    user_id: Annotated[UUID | None, Query()] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> AdminAiLogListResponse:
    return await admin.list_ai_logs(
        feature=feature,
        status=status,
        user_id=user_id,
        skip=skip,
        limit=limit,
    )
