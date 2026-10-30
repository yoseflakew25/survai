"""Create + list org lifecycle notifications (in-app + email)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.repositories.notification import NotificationRepository
from app.repositories.user import UserRepository
from app.schemas.notification import (
    NotificationListResponse,
    NotificationPublic,
    UnreadCountResponse,
)
from app.services.email import (
    email_delivery_configured,
    send_lifecycle_notification_email,
)

logger = logging.getLogger(__name__)

RESPONSE_MILESTONES = frozenset({1, 10, 50, 100, 250, 500, 1000})
DIGEST_MIN_DELTA = 5
DIGEST_MIN_AGE = timedelta(hours=1)


def _to_public(row: Notification) -> NotificationPublic:
    return NotificationPublic(
        id=row.id,
        type=row.type,  # type: ignore[arg-type]
        title=row.title,
        body=row.body,
        href=row.href,
        meta=row.meta,
        read_at=row.read_at,
        created_at=row.created_at,
        status="read" if row.read_at is not None else "unread",
    )


def _abs_url(href: str | None) -> str | None:
    if not href:
        return None
    if href.startswith("http://") or href.startswith("https://"):
        return href
    base = settings.frontend_url.rstrip("/")
    path = href if href.startswith("/") else f"/{href}"
    return f"{base}{path}"


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.notifications = NotificationRepository(session)
        self.users = UserRepository(session)

    async def list_mine(
        self, *, user: User, limit: int = 50, offset: int = 0
    ) -> NotificationListResponse:
        rows = await self.notifications.list_for_user(
            user_id=user.id, limit=limit, offset=offset
        )
        total = await self.notifications.count_for_user(user_id=user.id)
        unread = await self.notifications.unread_count(user_id=user.id)
        return NotificationListResponse(
            notifications=[_to_public(r) for r in rows],
            total=total,
            unread_count=unread,
        )

    async def unread_count(self, *, user: User) -> UnreadCountResponse:
        return UnreadCountResponse(
            unread_count=await self.notifications.unread_count(user_id=user.id)
        )

    async def mark_read(
        self, *, user: User, notification_id: UUID
    ) -> NotificationPublic:
        row = await self.notifications.mark_read(
            notification_id=notification_id,
            user_id=user.id,
            when=datetime.now(UTC),
        )
        if row is None:
            raise NotFoundError("Notification not found")
        await self.session.commit()
        return _to_public(row)

    async def mark_all_read(self, *, user: User) -> UnreadCountResponse:
        await self.notifications.mark_all_read(
            user_id=user.id, when=datetime.now(UTC)
        )
        await self.session.commit()
        return await self.unread_count(user=user)

    async def notify_org(
        self,
        *,
        organization_id: UUID,
        type: NotificationType | str,
        title: str,
        body: str,
        href: str | None = None,
        meta: dict[str, Any] | None = None,
        send_email: bool = True,
    ) -> list[Notification]:
        """Fan-out one notification to every active verified org member."""
        members = await self.users.list_active_by_organization(organization_id)
        if not members:
            logger.warning(
                "notify_org skipped — no active users org=%s type=%s",
                organization_id,
                type,
            )
            return []

        type_value = type.value if isinstance(type, NotificationType) else str(type)
        created: list[Notification] = []
        absolute = _abs_url(href)
        for member in members:
            row = Notification(
                user_id=member.id,
                organization_id=organization_id,
                type=type_value,
                title=title,
                body=body,
                href=href,
                meta=meta,
            )
            self.session.add(row)
            created.append(row)
        await self.session.flush()

        if send_email:
            deliver = email_delivery_configured()
            for member, row in zip(members, created, strict=True):
                try:
                    await send_lifecycle_notification_email(
                        to_email=member.email,
                        title=title,
                        body=body,
                        action_url=absolute,
                    )
                    if deliver:
                        row.email_sent_at = datetime.now(UTC)
                except Exception:
                    logger.exception(
                        "notification email failed user=%s type=%s",
                        member.id,
                        type_value,
                    )
            await self.session.flush()

        await self.session.commit()
        return created

    async def notify_survey_published(
        self, *, organization_id: UUID, survey_id: UUID, survey_title: str
    ) -> None:
        href = f"/dashboard/surveys/{survey_id}/collect"
        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.survey_published,
            title=f'Survey "{survey_title}" is live',
            body=(
                "Collection is open. Share the public link or QR code "
                "to start receiving responses."
            ),
            href=href,
            meta={"survey_id": str(survey_id)},
        )

    async def notify_survey_closed(
        self, *, organization_id: UUID, survey_id: UUID, survey_title: str
    ) -> None:
        href = f"/dashboard/surveys/{survey_id}/analytics"
        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.survey_closed,
            title=f'Collection closed for "{survey_title}"',
            body="New responses are no longer accepted. Review analytics or generate a report.",
            href=href,
            meta={"survey_id": str(survey_id)},
        )

    async def maybe_notify_responses(
        self,
        *,
        organization_id: UUID,
        survey_id: UUID,
        survey_title: str,
        response_count: int,
    ) -> None:
        """In-app on every completed response; email on milestones / digests."""
        if response_count < 1:
            return
        href = f"/dashboard/surveys/{survey_id}/respondents"
        meta = {
            "survey_id": str(survey_id),
            "response_count": response_count,
        }

        if response_count in RESPONSE_MILESTONES:
            await self.notify_org(
                organization_id=organization_id,
                type=NotificationType.response_milestone,
                title=(
                    f"{response_count} response"
                    f"{'s' if response_count != 1 else ''} for \"{survey_title}\""
                ),
                body=(
                    f"You reached {response_count} completed "
                    f"{'response' if response_count == 1 else 'responses'}."
                ),
                href=href,
                meta=meta,
                send_email=True,
            )
            return

        # Always surface in-app so each submission is visible immediately.
        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.response_received,
            title=f'New response for "{survey_title}"',
            body=f"Total completed responses: {response_count}.",
            href=href,
            meta=meta,
            send_email=False,
        )

        last = await self.notifications.latest_response_email_marker(
            organization_id=organization_id, survey_id=survey_id
        )
        last_count = 0
        if last is not None:
            last_count = int((last.meta or {}).get("response_count") or 0)
            age = datetime.now(UTC) - last.created_at
            if age < DIGEST_MIN_AGE:
                return
        if response_count - last_count < DIGEST_MIN_DELTA:
            return

        delta = response_count - last_count
        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.response_digest,
            title=f'{delta} new responses for "{survey_title}"',
            body=f"Total completed responses: {response_count}.",
            href=href,
            meta=meta,
            send_email=True,
        )

    async def notify_review_complete(
        self,
        *,
        organization_id: UUID,
        survey_id: UUID,
        survey_title: str,
        finding_count: int,
        quality_score: float,
    ) -> None:
        href = f"/dashboard/surveys/{survey_id}/review"
        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.review_complete,
            title=f'AI review ready for "{survey_title}"',
            body=(
                f"Quality score {quality_score:.1f}/5 with "
                f"{finding_count} finding{'s' if finding_count != 1 else ''}."
            ),
            href=href,
            meta={
                "survey_id": str(survey_id),
                "finding_count": finding_count,
                "quality_score": quality_score,
            },
        )

    async def notify_report_ready(
        self,
        *,
        organization_id: UUID,
        survey_id: UUID,
        survey_title: str,
        report_id: UUID,
    ) -> None:
        href = f"/dashboard/surveys/{survey_id}/reports"
        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.report_ready,
            title=f'Report ready for "{survey_title}"',
            body="Your grounded narrative report is ready to review and export.",
            href=href,
            meta={
                "survey_id": str(survey_id),
                "report_id": str(report_id),
            },
        )

    async def notify_report_failed(
        self,
        *,
        organization_id: UUID,
        survey_id: UUID,
        survey_title: str,
        detail: str | None = None,
    ) -> None:
        href = f"/dashboard/surveys/{survey_id}/reports"
        body = "Report generation failed. Open the survey and try again."
        if detail:
            body = f"{body} ({detail[:180]})"
        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.report_failed,
            title=f'Report failed for "{survey_title}"',
            body=body,
            href=href,
            meta={"survey_id": str(survey_id)},
        )
