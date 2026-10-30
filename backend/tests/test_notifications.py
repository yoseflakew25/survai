"""Org notification feed + publish emitter."""

from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.notification import Notification, NotificationType
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.services.notification import NotificationService


async def _org_user(session, *, email: str = "notify@example.com") -> User:
    org = Organization(name="Notify Org")
    session.add(org)
    await session.flush()
    user = User(
        email=email,
        full_name="Notify User",
        hashed_password=hash_password("SecurePass1!"),
        role=UserRole.organization,
        is_superuser=False,
        is_active=True,
        email_verified=True,
        organization_id=org.id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_list_and_mark_read(client: AsyncClient, session) -> None:
    user = await _org_user(session)
    session.add(
        Notification(
            user_id=user.id,
            organization_id=user.organization_id,
            type=NotificationType.survey_published.value,
            title="Survey is live",
            body="Share the link",
            href="/dashboard/surveys/x/collect",
            meta={"survey_id": str(uuid4())},
        )
    )
    await session.commit()

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "notify@example.com", "password": "SecurePass1!"},
    )
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    listed = await client.get("/api/v1/notifications", headers=headers)
    assert listed.status_code == 200, listed.text
    body = listed.json()
    assert body["total"] == 1
    assert body["unread_count"] == 1
    assert body["notifications"][0]["status"] == "unread"
    nid = body["notifications"][0]["id"]

    unread = await client.get("/api/v1/notifications/unread-count", headers=headers)
    assert unread.json()["unread_count"] == 1

    marked = await client.post(f"/api/v1/notifications/{nid}/read", headers=headers)
    assert marked.status_code == 200, marked.text
    assert marked.json()["status"] == "read"

    unread2 = await client.get("/api/v1/notifications/unread-count", headers=headers)
    assert unread2.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_notify_org_creates_row_and_attempts_email(
    session, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await _org_user(session, email="mail@example.com")
    send = AsyncMock()
    monkeypatch.setattr(
        "app.services.notification.send_lifecycle_notification_email",
        send,
    )
    monkeypatch.setattr(
        "app.services.notification.email_delivery_configured",
        lambda: True,
    )
    svc = NotificationService(session)
    rows = await svc.notify_org(
        organization_id=user.organization_id,
        type=NotificationType.report_ready,
        title="Report ready",
        body="Open it",
        href="/dashboard/surveys/abc/reports",
        meta={"survey_id": "abc"},
    )
    assert len(rows) == 1
    assert rows[0].email_sent_at is not None
    send.assert_awaited_once()
    args = send.await_args.kwargs
    assert args["to_email"] == "mail@example.com"
    assert "Open in SurvAI" not in args["body"]
    assert args["action_url"] and args["action_url"].endswith(
        "/dashboard/surveys/abc/reports"
    )


@pytest.mark.asyncio
async def test_response_milestone_at_one(session, monkeypatch: pytest.MonkeyPatch) -> None:
    user = await _org_user(session, email="mile@example.com")
    monkeypatch.setattr(
        "app.services.notification.send_lifecycle_notification_email",
        AsyncMock(),
    )
    svc = NotificationService(session)
    sid = uuid4()
    await svc.maybe_notify_responses(
        organization_id=user.organization_id,
        survey_id=sid,
        survey_title="Pilot Survey",
        response_count=1,
    )
    listed = await svc.list_mine(user=user)
    assert listed.total == 1
    assert listed.notifications[0].type == "response_milestone"


@pytest.mark.asyncio
async def test_response_received_for_non_milestone(
    session, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await _org_user(session, email="recv@example.com")
    monkeypatch.setattr(
        "app.services.notification.send_lifecycle_notification_email",
        AsyncMock(),
    )
    svc = NotificationService(session)
    sid = uuid4()
    await svc.maybe_notify_responses(
        organization_id=user.organization_id,
        survey_id=sid,
        survey_title="Live Survey",
        response_count=4,
    )
    listed = await svc.list_mine(user=user)
    assert listed.total == 1
    assert listed.notifications[0].type == "response_received"
    assert listed.notifications[0].status == "unread"
