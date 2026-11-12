from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import AdminServiceDep, AdminUser
from app.schemas.admin import AdminHealthResponse

router = APIRouter()


@router.get("/health", response_model=AdminHealthResponse)
async def admin_health(_: AdminUser, admin: AdminServiceDep) -> AdminHealthResponse:
    return admin.health()
