from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import AdminServiceDep, AdminUser
from app.models.user import UserRole
from app.schemas.admin import AdminUserCreate, AdminUserListResponse, AdminUserUpdate
from app.schemas.user import UserPublic

router = APIRouter(prefix="/users")


@router.get("", response_model=AdminUserListResponse)
async def list_users(
    _: AdminUser,
    admin: AdminServiceDep,
    search: Annotated[str | None, Query(max_length=200)] = None,
    role: Annotated[UserRole | None, Query()] = None,
    organization_id: Annotated[UUID | None, Query()] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> AdminUserListResponse:
    return await admin.list_users(
        search=search,
        role=role,
        organization_id=organization_id,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: AdminUserCreate,
    current: AdminUser,
    admin: AdminServiceDep,
) -> UserPublic:
    return await admin.create_user(actor=current, body=body)


@router.patch("/{user_id}", response_model=UserPublic)
async def update_user(
    user_id: UUID,
    body: AdminUserUpdate,
    current: AdminUser,
    admin: AdminServiceDep,
) -> UserPublic:
    return await admin.update_user(actor=current, user_id=user_id, body=body)
