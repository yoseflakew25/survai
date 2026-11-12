from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import AdminServiceDep, AdminUser
from app.schemas.admin import AdminOverviewResponse

router = APIRouter()


@router.get("/overview", response_model=AdminOverviewResponse)
async def admin_overview(
    _: AdminUser,
    admin: AdminServiceDep,
) -> AdminOverviewResponse:
    return await admin.overview()
