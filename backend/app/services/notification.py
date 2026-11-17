"""Create + list org lifecycle notifications (in-app + email)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.core.i18n import normalize_locale
from app.core.notification_i18n import render_notification
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


def _render_for_user(
    row: Notification, *, locale: str | None
) -> tuple[str, str]:
    meta = row.meta or {}
    key = meta.get("message_key") or row.type
    params = dict(meta.get("params") or {})
    # Legacy rows may keep survey_title only at top-level meta.
    if "survey_title" not in params and meta.get("survey_title"):
        params["survey_title"] = meta["survey_title"]
    if "response_count" not in params and meta.get("response_count") is not None:
        params["response_count"] = meta["response_count"]
    rendered = render_notification(str(key), locale=locale, params=params)
    if rendered:
        return rendered
    return row.title, row.body


def _to_public(row: Notification, *, locale: str | None = None) -> NotificationPublic:
    title, body = _render_for_user(row, locale=locale)
    return NotificationPublic(
        id=row.id,
        type=row.type,  # type: ignore[arg-type]
        title=title,
        body=body,
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
    return settings.frontend_absolute_url(href)


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
        total, unread = await self.notifications.counts_for_user(user_id=user.id)
        locale = getattr(user, "ui_locale", None) or "en"
        return NotificationListResponse(
            notifications=[_to_public(r, locale=locale) for r in rows],
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
        return _to_public(row, locale=getattr(user, "ui_locale", None))

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
        message_key: str,
        params: dict[str, Any] | None = None,
        href: str | None = None,
        meta: dict[str, Any] | None = None,
        send_email: bool = True,
        # Legacy fallbacks when catalogs miss a key
        title: str | None = None,
        body: str | None = None,
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
        params = dict(params or {})
        base_meta: dict[str, Any] = {
            **(meta or {}),
            "message_key": message_key,
            "params": params,
        }
        created: list[Notification] = []
        absolute = _abs_url(href)
        for member in members:
            locale = normalize_locale(getattr(member, "ui_locale", None))
            rendered = render_notification(
                message_key, locale=locale, params=params
            )
            row_title = (rendered[0] if rendered else title) or message_key
            row_body = (rendered[1] if rendered else body) or ""
            row = Notification(
                user_id=member.id,
                organization_id=organization_id,
                type=type_value,
                title=row_title,
                body=row_body,
                href=href,
                meta=base_meta,
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
                        title=row.title,
                        body=row.body,
                        action_url=absolute,
                        locale=getattr(member, "ui_locale", None),
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
            message_key="survey_published",
            params={"survey_title": survey_title},
            href=href,
            meta={"survey_id": str(survey_id), "survey_title": survey_title},
        )

    async def notify_survey_closed(
        self, *, organization_id: UUID, survey_id: UUID, survey_title: str
    ) -> None:
        href = f"/dashboard/surveys/{survey_id}/analytics"
        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.survey_closed,
            message_key="survey_closed",
            params={"survey_title": survey_title},
            href=href,
            meta={"survey_id": str(survey_id), "survey_title": survey_title},
        )

    async def maybe_notify_responses(
        self,
        *,
        organization_id: UUID,
        survey_id: UUID,
        survey_title: str,
        response_count: int,
        respondent_id: UUID | None = None,
    ) -> None:
        """In-app on every completed response; email on milestones / digests."""
        if response_count < 1:
            return
        if respondent_id is not None:
            href = (
                f"/dashboard/surveys/{survey_id}/respondents"
                f"?respondent={respondent_id}"
            )
        else:
            href = f"/dashboard/surveys/{survey_id}/respondents"
        meta: dict[str, Any] = {
            "survey_id": str(survey_id),
            "survey_title": survey_title,
            "response_count": response_count,
        }
        if respondent_id is not None:
            meta["respondent_id"] = str(respondent_id)
        params = {
            "survey_title": survey_title,
            "response_count": response_count,
        }

        if response_count in RESPONSE_MILESTONES:
            await self.notify_org(
                organization_id=organization_id,
                type=NotificationType.response_milestone,
                message_key="response_milestone",
                params=params,
                href=href,
                meta=meta,
                send_email=True,
            )
            return

        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.response_received,
            message_key="response_received",
            params=params,
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
            message_key="response_digest",
            params={**params, "delta": delta},
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
            message_key="review_complete",
            params={"survey_title": survey_title},
            href=href,
            meta={
                "survey_id": str(survey_id),
                "survey_title": survey_title,
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
        href = (
            f"/dashboard/surveys/{survey_id}/reports"
            f"?reportId={report_id}"
        )
        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.report_ready,
            message_key="report_ready",
            params={"survey_title": survey_title},
            href=href,
            meta={
                "survey_id": str(survey_id),
                "report_id": str(report_id),
                "survey_title": survey_title,
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
        await self.notify_org(
            organization_id=organization_id,
            type=NotificationType.report_failed,
            message_key="report_failed",
            params={
                "survey_title": survey_title,
                "detail": detail or "",
            },
            href=href,
            meta={"survey_id": str(survey_id), "survey_title": survey_title},
        )
