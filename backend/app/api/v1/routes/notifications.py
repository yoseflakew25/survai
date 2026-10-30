"""In-app notification feed for the signed-in org user."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, NotificationServiceDep
from app.schemas.notification import (
    NotificationListResponse,
    NotificationPublic,
    UnreadCountResponse,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: CurrentUser,
    notifications: NotificationServiceDep,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> NotificationListResponse:
    return await notifications.list_mine(
        user=current_user, limit=limit, offset=offset
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    current_user: CurrentUser,
    notifications: NotificationServiceDep,
) -> UnreadCountResponse:
    return await notifications.unread_count(user=current_user)


@router.post(
    "/{notification_id}/read",
    response_model=NotificationPublic,
)
async def mark_notification_read(
    notification_id: UUID,
    current_user: CurrentUser,
    notifications: NotificationServiceDep,
) -> NotificationPublic:
    return await notifications.mark_read(
        user=current_user, notification_id=notification_id
    )


@router.post("/read-all", response_model=UnreadCountResponse)
async def mark_all_notifications_read(
    current_user: CurrentUser,
    notifications: NotificationServiceDep,
) -> UnreadCountResponse:
    return await notifications.mark_all_read(user=current_user)
