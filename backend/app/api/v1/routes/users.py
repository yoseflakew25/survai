from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, CurrentUser, UserServiceDep
from app.schemas.user import UserCreate, UserPublic, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
async def read_me(current_user: CurrentUser) -> UserPublic:
    return UserPublic.model_validate(current_user)


@router.get("", response_model=list[UserPublic])
async def list_users(
    _: AdminUser,
    users: UserServiceDep,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[UserPublic]:
    rows = await users.list_users(skip=skip, limit=limit)
    return [UserPublic.model_validate(u) for u in rows]


@router.post("", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    _: AdminUser,
    users: UserServiceDep,
) -> UserPublic:
    user = await users.create(body)
    return UserPublic.model_validate(user)


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: UUID,
    _: AdminUser,
    users: UserServiceDep,
) -> UserPublic:
    user = await users.get(user_id)
    return UserPublic.model_validate(user)


@router.patch("/{user_id}", response_model=UserPublic)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    _: AdminUser,
    users: UserServiceDep,
) -> UserPublic:
    user = await users.update(user_id, body)
    return UserPublic.model_validate(user)
