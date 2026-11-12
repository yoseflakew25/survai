"""System-admin platform operations (cross-org)."""

from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, literal_column, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.core.feature_flags import FEATURE_FLAG_KEYS, default_flags_map
from app.core.geo import COUNTRY_META, country_centroid, country_label, country_numeric_id
from app.db.session import AsyncSessionLocal
from app.core.security import (
    create_access_token,
    create_refresh_token_value,
    hash_password,
    hash_token,
)
from app.models.ai_generation_log import AiGenerationLog
from app.models.audit_log import AuditLog
from app.models.collection import Respondent
from app.models.organization import Organization
from app.models.refresh_token import RefreshToken
from app.models.survey import Survey, SurveyStatus
from app.models.user import User, UserRole
from app.repositories.organization import OrganizationRepository
from app.repositories.refresh_token import RefreshTokenRepository
from app.repositories.user import UserRepository
from app.schemas.admin import (
    AdminAiLogItem,
    AdminAiLogListResponse,
    AdminAuditItem,
    AdminAuditListResponse,
    AdminFeatureFlagsResponse,
    AdminHealthResponse,
    AdminImpersonateResponse,
    AdminInspectMember,
    AdminInspectSurvey,
    AdminOrgInspectResponse,
    AdminOrgListResponse,
    AdminOrgPublic,
    AdminOrgUpdate,
    AdminOverviewAlert,
    AdminOverviewBreakdownItem,
    AdminOverviewGeoCountry,
    AdminOverviewGeoPresence,
    AdminOverviewKpi,
    AdminOverviewOrgSnippet,
    AdminOverviewResponse,
    AdminOverviewSeriesPoint,
    AdminUserCreate,
    AdminUserListResponse,
    AdminUserUpdate,
)
from app.schemas.user import UserPublic
from app.services.audit import record_audit
from app.jobs.settings import redis_dsn


def _fmt(n: int) -> str:
    return f"{n:,}"


def _delta_count(current: int, previous: int, *, unit: str = "vs prior 7d") -> tuple[str, str]:
    diff = current - previous
    if diff > 0:
        return f"+{diff:,} {unit}", "up"
    if diff < 0:
        return f"{diff:,} {unit}", "down"
    return f"0 {unit}", "flat"


def _day_key(dt: datetime | date | str) -> str:
    if isinstance(dt, str):
        return dt[:10]
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC).strftime("%Y-%m-%d")
    return dt.strftime("%Y-%m-%d")


def _day_bucket(session: AsyncSession, column):  # noqa: ANN001
    """Day bucket expression portable across Postgres and SQLite tests."""
    bind = session.bind
    dialect = getattr(getattr(bind, "dialect", None), "name", None)
    if dialect == "sqlite" or (dialect is None and "sqlite" in settings.database_url.lower()):
        return func.strftime("%Y-%m-%d", column)
    return func.date_trunc(literal_column("'day'"), column)


_ROLE_LABELS = {
    UserRole.system_admin.value: "System admins",
    UserRole.organization.value: "Owners",
    UserRole.researcher.value: "Researchers",
    UserRole.viewer.value: "Viewers",
}

_FEATURE_LABELS = {
    "planner": "Planner",
    "builder": "Builder",
    "reviewer": "Reviewer",
    "report": "Report",
    "assistant": "Assistant",
    "ai_planner": "Planner",
    "ai_builder": "Builder",
    "ai_reviewer": "Reviewer",
    "ai_report": "Report",
    "ai_assistant": "Assistant",
}


def _org_public(
    org: Organization, *, member_count: int = 0, survey_count: int = 0
) -> AdminOrgPublic:
    return AdminOrgPublic(
        id=org.id,
        name=org.name,
        description=org.description,
        website=org.website,
        is_active=org.is_active,
        suspended_at=org.suspended_at,
        suspended_reason=org.suspended_reason,
        feature_flags=default_flags_map(org.feature_flags),
        notes=org.notes,
        member_count=member_count,
        survey_count=survey_count,
        created_at=org.created_at,
        updated_at=org.updated_at,
    )


def _audit_item(row: AuditLog, *, actor_email: str | None = None) -> AdminAuditItem:
    return AdminAuditItem(
        id=row.id,
        actor_user_id=row.actor_user_id,
        actor_email=actor_email,
        action=row.action,
        resource_type=row.resource_type,
        resource_id=row.resource_id,
        organization_id=row.organization_id,
        metadata=row.meta,
        ip=row.ip,
        created_at=row.created_at,
    )


class AdminService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.orgs = OrganizationRepository(session)
        self.users = UserRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)

    async def overview(self) -> AdminOverviewResponse:
        """Platform KPIs — parallel DB sessions to cut Aiven round-trip waterfalls."""
        now = datetime.now(UTC)
        d7 = now - timedelta(days=7)
        d14 = now - timedelta(days=14)
        d30 = now - timedelta(days=30)

        async def _run(work):  # noqa: ANN001, ANN202
            async with AsyncSessionLocal() as session:
                return await work(session)

        async def core_counts(session: AsyncSession):
            org_row = (
                await session.execute(
                    select(
                        func.count(),
                        func.count().filter(Organization.is_active.is_(True)),
                        func.count().filter(Organization.created_at >= d7),
                        func.count().filter(
                            Organization.created_at >= d14,
                            Organization.created_at < d7,
                        ),
                    ).select_from(Organization)
                )
            ).one()
            user_row = (
                await session.execute(
                    select(
                        func.count(),
                        func.count().filter(User.is_active.is_(True)),
                        func.count().filter(User.created_at >= d7),
                        func.count().filter(
                            User.created_at >= d14, User.created_at < d7
                        ),
                        func.count().filter(User.email_verified.is_(False)),
                    ).select_from(User)
                )
            ).one()
            survey_row = (
                await session.execute(
                    select(
                        func.count(),
                        func.count().filter(Survey.status == SurveyStatus.draft.value),
                        func.count().filter(
                            Survey.status == SurveyStatus.published.value
                        ),
                        func.count().filter(Survey.status == SurveyStatus.closed.value),
                        func.count().filter(
                            Survey.status == SurveyStatus.archived.value
                        ),
                        func.count().filter(Survey.created_at >= d7),
                        func.count().filter(
                            Survey.created_at >= d14, Survey.created_at < d7
                        ),
                    ).select_from(Survey)
                )
            ).one()
            response_row = (
                await session.execute(
                    select(
                        func.count().filter(
                            Respondent.completed_at.is_not(None),
                            Respondent.completed_at >= d7,
                        ),
                        func.count().filter(
                            Respondent.completed_at.is_not(None),
                            Respondent.completed_at >= d30,
                        ),
                        func.count().filter(
                            Respondent.completed_at.is_not(None),
                            Respondent.completed_at >= d14,
                            Respondent.completed_at < d7,
                        ),
                        func.count().filter(Respondent.started_at >= d7),
                    ).select_from(Respondent)
                )
            ).one()
            return org_row, user_row, survey_row, response_row

        async def ai_counts(session: AsyncSession):
            window = (
                await session.execute(
                    select(
                        func.count(),
                        func.count().filter(AiGenerationLog.status != "success"),
                        func.coalesce(func.sum(AiGenerationLog.tokens_input), 0),
                        func.coalesce(func.sum(AiGenerationLog.tokens_output), 0),
                        func.avg(AiGenerationLog.latency_ms),
                    )
                    .select_from(AiGenerationLog)
                    .where(AiGenerationLog.created_at >= d7)
                )
            ).one()
            prev = int(
                (
                    await session.execute(
                        select(func.count())
                        .select_from(AiGenerationLog)
                        .where(
                            AiGenerationLog.created_at >= d14,
                            AiGenerationLog.created_at < d7,
                        )
                    )
                ).scalar_one()
                or 0
            )
            month = int(
                (
                    await session.execute(
                        select(func.count())
                        .select_from(AiGenerationLog)
                        .where(AiGenerationLog.created_at >= d30)
                    )
                ).scalar_one()
                or 0
            )
            return (
                int(window[0] or 0),
                int(window[1] or 0),
                prev,
                month,
                int(window[2] or 0),
                int(window[3] or 0),
                float(window[4]) if window[4] is not None else None,
            )

        async def series_and_breakdowns(session: AsyncSession):
            completed_day = _day_bucket(session, Respondent.completed_at)
            ai_day = _day_bucket(session, AiGenerationLog.created_at)
            completed_by_day = {
                _day_key(row[0]): int(row[1])
                for row in (
                    await session.execute(
                        select(completed_day, func.count())
                        .where(
                            Respondent.completed_at.is_not(None),
                            Respondent.completed_at >= d30,
                        )
                        .group_by(completed_day)
                    )
                ).all()
                if row[0] is not None
            }
            ai_by_day: dict[str, tuple[int, int]] = {}
            for row in (
                await session.execute(
                    select(
                        ai_day,
                        func.count(),
                        func.count().filter(AiGenerationLog.status != "success"),
                    )
                    .where(AiGenerationLog.created_at >= d30)
                    .group_by(ai_day)
                )
            ).all():
                if row[0] is None:
                    continue
                ai_by_day[_day_key(row[0])] = (int(row[1] or 0), int(row[2] or 0))
            role_rows = (
                await session.execute(
                    select(User.role, func.count()).group_by(User.role)
                )
            ).all()
            feature_rows = (
                await session.execute(
                    select(AiGenerationLog.feature, func.count())
                    .where(AiGenerationLog.created_at >= d7)
                    .group_by(AiGenerationLog.feature)
                    .order_by(func.count().desc())
                )
            ).all()
            geo_rows = (
                await session.execute(
                    select(User.last_country, func.count())
                    .where(User.last_country.is_not(None))
                    .group_by(User.last_country)
                    .order_by(func.count().desc())
                )
            ).all()
            return completed_by_day, ai_by_day, role_rows, feature_rows, geo_rows

        async def feeds(session: AsyncSession):
            recent_org_rows = (
                await session.execute(
                    select(Organization)
                    .order_by(Organization.created_at.desc())
                    .limit(8)
                )
            ).scalars().all()
            org_ids = [org.id for org in recent_org_rows]
            member_counts: dict = {}
            survey_counts: dict = {}
            if org_ids:
                member_counts = dict(
                    (
                        await session.execute(
                            select(User.organization_id, func.count())
                            .where(User.organization_id.in_(org_ids))
                            .group_by(User.organization_id)
                        )
                    ).all()
                )
                survey_counts = dict(
                    (
                        await session.execute(
                            select(Survey.organization_id, func.count())
                            .where(Survey.organization_id.in_(org_ids))
                            .group_by(Survey.organization_id)
                        )
                    ).all()
                )
            audit_rows = (
                await session.execute(
                    select(AuditLog).order_by(AuditLog.created_at.desc()).limit(10)
                )
            ).scalars().all()
            actor_ids = {row.actor_user_id for row in audit_rows if row.actor_user_id}
            actor_emails: dict[UUID, str] = {}
            if actor_ids:
                for uid, email in (
                    await session.execute(
                        select(User.id, User.email).where(User.id.in_(actor_ids))
                    )
                ).all():
                    actor_emails[uid] = email
            fail_rows = (
                await session.execute(
                    select(AiGenerationLog)
                    .where(AiGenerationLog.status != "success")
                    .order_by(AiGenerationLog.created_at.desc())
                    .limit(8)
                )
            ).scalars().all()
            fail_user_ids = {row.user_id for row in fail_rows if row.user_id}
            fail_emails: dict[UUID, str] = {}
            if fail_user_ids:
                for uid, email in (
                    await session.execute(
                        select(User.id, User.email).where(User.id.in_(fail_user_ids))
                    )
                ).all():
                    fail_emails[uid] = email
            return (
                recent_org_rows,
                member_counts,
                survey_counts,
                audit_rows,
                actor_emails,
                fail_rows,
                fail_emails,
            )

        (
            (org_row, user_row, survey_row, response_row),
            ai_row,
            (completed_by_day, ai_by_day, role_rows, feature_rows, geo_rows),
            (
                recent_org_rows,
                member_counts,
                survey_counts,
                audit_rows,
                actor_emails,
                fail_rows,
                fail_emails,
            ),
        ) = await asyncio.gather(
            _run(core_counts),
            _run(ai_counts),
            _run(series_and_breakdowns),
            _run(feeds),
        )

        orgs_total = int(org_row[0] or 0)
        orgs_active = int(org_row[1] or 0)
        orgs_suspended = orgs_total - orgs_active
        orgs_7d = int(org_row[2] or 0)
        orgs_prev_7d = int(org_row[3] or 0)

        users_total = int(user_row[0] or 0)
        users_active = int(user_row[1] or 0)
        users_inactive = users_total - users_active
        users_7d = int(user_row[2] or 0)
        users_prev_7d = int(user_row[3] or 0)
        users_unverified = int(user_row[4] or 0)

        surveys_total = int(survey_row[0] or 0)
        surveys_draft = int(survey_row[1] or 0)
        surveys_published = int(survey_row[2] or 0)
        surveys_closed = int(survey_row[3] or 0)
        surveys_archived = int(survey_row[4] or 0)
        surveys_7d = int(survey_row[5] or 0)
        surveys_prev_7d = int(survey_row[6] or 0)

        responses_7d = int(response_row[0] or 0)
        responses_30d = int(response_row[1] or 0)
        responses_prev_7d = int(response_row[2] or 0)
        responses_started_7d = int(response_row[3] or 0)
        completion_rate_7d = (
            responses_7d / responses_started_7d if responses_started_7d else 0.0
        )

        ai_calls_7d = int(ai_row[0] or 0)
        ai_errors_7d = int(ai_row[1] or 0)
        ai_calls_prev_7d = int(ai_row[2] or 0)
        ai_calls_30d = int(ai_row[3] or 0)
        ai_tokens_7d = int(ai_row[4] or 0) + int(ai_row[5] or 0)
        ai_avg_latency = float(ai_row[6]) if ai_row[6] is not None else None
        ai_error_rate = (ai_errors_7d / ai_calls_7d) if ai_calls_7d else 0.0

        series_30d: list[AdminOverviewSeriesPoint] = []
        for offset in range(29, -1, -1):
            day = (now - timedelta(days=offset)).date()
            key = day.strftime("%Y-%m-%d")
            calls, errors = ai_by_day.get(key, (0, 0))
            series_30d.append(
                AdminOverviewSeriesPoint(
                    date=key,
                    label=f"{day.strftime('%b')} {day.day}",
                    responses_started=0,
                    responses_completed=completed_by_day.get(key, 0),
                    ai_calls=calls,
                    ai_errors=errors,
                    signups=0,
                )
            )

        user_roles = [
            AdminOverviewBreakdownItem(
                key=(role_key := getattr(role, "value", str(role))),
                label=_ROLE_LABELS.get(
                    role_key, str(role_key).replace("_", " ").title()
                ),
                count=int(count or 0),
            )
            for role, count in role_rows
        ]
        user_roles.sort(key=lambda x: x.count, reverse=True)

        survey_status = [
            AdminOverviewBreakdownItem(key="draft", label="Draft", count=surveys_draft),
            AdminOverviewBreakdownItem(
                key="published", label="Published", count=surveys_published
            ),
            AdminOverviewBreakdownItem(key="closed", label="Closed", count=surveys_closed),
            AdminOverviewBreakdownItem(
                key="archived", label="Archived", count=surveys_archived
            ),
        ]

        ai_by_feature_7d = [
            AdminOverviewBreakdownItem(
                key=str(feature),
                label=_FEATURE_LABELS.get(
                    str(feature), str(feature).replace("_", " ").title()
                ),
                count=int(count or 0),
            )
            for feature, count in feature_rows
        ]

        recent_orgs = [
            AdminOverviewOrgSnippet(
                id=org.id,
                name=org.name,
                is_active=org.is_active,
                member_count=int(member_counts.get(org.id, 0) or 0),
                survey_count=int(survey_counts.get(org.id, 0) or 0),
                created_at=org.created_at,
            )
            for org in recent_org_rows
        ]
        recent_audit = [
            _audit_item(row, actor_email=actor_emails.get(row.actor_user_id))
            for row in audit_rows
        ]
        recent_ai_failures = [
            AdminAiLogItem(
                id=row.id,
                feature=row.feature,
                user_id=row.user_id,
                user_email=fail_emails.get(row.user_id) if row.user_id else None,
                model=row.model,
                status=row.status,
                tokens_input=row.tokens_input,
                tokens_output=row.tokens_output,
                latency_ms=row.latency_ms,
                error_message=row.error_message,
                created_at=row.created_at,
            )
            for row in fail_rows
        ]

        health = self.health()
        alerts: list[AdminOverviewAlert] = []
        if orgs_suspended > 0:
            alerts.append(
                AdminOverviewAlert(
                    id="suspended-orgs",
                    severity="warning",
                    title=f"{orgs_suspended} suspended organization"
                    + ("s" if orgs_suspended != 1 else ""),
                    detail="Suspended orgs block member login until reactivated.",
                    href="/admin/orgs?active=false",
                )
            )
        if ai_error_rate >= 0.15 and ai_calls_7d >= 5:
            alerts.append(
                AdminOverviewAlert(
                    id="ai-error-rate",
                    severity="critical",
                    title=f"AI error rate {ai_error_rate:.0%} (7d)",
                    detail=f"{ai_errors_7d} failed of {ai_calls_7d} calls in the last 7 days.",
                    href="/admin/ai-logs?status=error",
                )
            )
        elif ai_errors_7d > 0:
            alerts.append(
                AdminOverviewAlert(
                    id="ai-errors",
                    severity="info",
                    title=f"{ai_errors_7d} AI failures (7d)",
                    detail="Review recent AI usage for provider or prompt issues.",
                    href="/admin/ai-logs",
                )
            )
        if users_unverified > 0:
            alerts.append(
                AdminOverviewAlert(
                    id="unverified-users",
                    severity="info",
                    title=f"{users_unverified} unverified user"
                    + ("s" if users_unverified != 1 else ""),
                    detail="Accounts still waiting on email verification.",
                    href="/admin/users",
                )
            )
        if health.jobs_mode == "inline" and settings.environment == "production":
            alerts.append(
                AdminOverviewAlert(
                    id="jobs-inline",
                    severity="warning",
                    title="Jobs running inline",
                    detail="Background jobs are not using a worker queue in production.",
                    href="/admin/health",
                )
            )
        if not health.redis_configured:
            alerts.append(
                AdminOverviewAlert(
                    id="redis-missing",
                    severity="info",
                    title="Redis not configured",
                    detail="Overview cache and job queue stay process-local without Redis.",
                    href="/admin/health",
                )
            )

        org_delta, org_trend = _delta_count(orgs_7d, orgs_prev_7d)
        user_delta, user_trend = _delta_count(users_7d, users_prev_7d)
        survey_delta, survey_trend = _delta_count(surveys_7d, surveys_prev_7d)
        response_delta, response_trend = _delta_count(responses_7d, responses_prev_7d)
        ai_delta, ai_trend = _delta_count(ai_calls_7d, ai_calls_prev_7d)

        kpis = [
            AdminOverviewKpi(
                key="orgs",
                label="Organizations",
                value=_fmt(orgs_total),
                hint=f"{orgs_active} active · {orgs_suspended} suspended",
                delta=org_delta,
                trend=org_trend,
                href="/admin/orgs",
            ),
            AdminOverviewKpi(
                key="users",
                label="Users",
                value=_fmt(users_total),
                hint=f"{users_active} active · {_fmt(users_7d)} new (7d)",
                delta=user_delta,
                trend=user_trend,
                href="/admin/users",
            ),
            AdminOverviewKpi(
                key="surveys",
                label="Surveys",
                value=_fmt(surveys_total),
                hint=f"{surveys_published} published · {surveys_draft} draft",
                delta=survey_delta,
                trend=survey_trend,
                href="/admin/orgs",
            ),
            AdminOverviewKpi(
                key="responses_7d",
                label="Responses (7d)",
                value=_fmt(responses_7d),
                hint=f"{_fmt(responses_30d)} in 30d · {completion_rate_7d:.0%} complete",
                delta=response_delta,
                trend=response_trend,
                href="/admin/orgs",
            ),
            AdminOverviewKpi(
                key="ai_7d",
                label="AI calls (7d)",
                value=_fmt(ai_calls_7d),
                hint=f"{ai_error_rate:.0%} errors · {_fmt(ai_tokens_7d)} tokens",
                delta=ai_delta,
                trend=ai_trend,
                href="/admin/ai-logs",
            ),
            AdminOverviewKpi(
                key="ai_latency",
                label="AI latency (7d)",
                value=(
                    f"{ai_avg_latency:.0f} ms"
                    if ai_avg_latency is not None
                    else "—"
                ),
                hint=f"{_fmt(ai_calls_30d)} calls in 30d",
                delta=None,
                trend="flat",
                href="/admin/ai-logs",
            ),
        ]

        geo_countries: list[AdminOverviewGeoCountry] = []
        users_located = 0
        for code, count in geo_rows:
            if not code:
                continue
            centroid = country_centroid(str(code))
            if centroid is None:
                users_located += int(count or 0)
                continue
            lat, lng = centroid
            n = int(count or 0)
            users_located += n
            geo_countries.append(
                AdminOverviewGeoCountry(
                    code=str(code).upper(),
                    name=country_label(str(code)),
                    count=n,
                    lat=lat,
                    lng=lng,
                    numeric_id=country_numeric_id(str(code)),
                )
            )
        geo_countries.sort(
            key=lambda c: (-c.count, COUNTRY_META.get(c.code, (c.name,))[0])
        )
        users_unknown = max(0, users_total - users_located)

        return AdminOverviewResponse(
            generated_at=now,
            kpis=kpis,
            orgs_total=orgs_total,
            orgs_active=orgs_active,
            orgs_suspended=orgs_suspended,
            users_total=users_total,
            users_active=users_active,
            users_inactive=users_inactive,
            users_7d=users_7d,
            users_prev_7d=users_prev_7d,
            surveys_total=surveys_total,
            surveys_draft=surveys_draft,
            surveys_published=surveys_published,
            surveys_closed=surveys_closed,
            surveys_archived=surveys_archived,
            responses_7d=responses_7d,
            responses_30d=responses_30d,
            responses_prev_7d=responses_prev_7d,
            responses_started_7d=responses_started_7d,
            completion_rate_7d=completion_rate_7d,
            ai_calls_7d=ai_calls_7d,
            ai_calls_prev_7d=ai_calls_prev_7d,
            ai_calls_30d=ai_calls_30d,
            ai_errors_7d=ai_errors_7d,
            ai_error_rate_7d=ai_error_rate,
            ai_tokens_7d=ai_tokens_7d,
            ai_avg_latency_ms_7d=ai_avg_latency,
            series_30d=series_30d,
            survey_status=survey_status,
            user_roles=user_roles,
            ai_by_feature_7d=ai_by_feature_7d,
            alerts=alerts,
            recent_orgs=recent_orgs,
            recent_audit=recent_audit,
            recent_ai_failures=recent_ai_failures,
            geo_presence=AdminOverviewGeoPresence(
                countries=geo_countries,
                users_located=users_located,
                users_unknown=users_unknown,
            ),
            health=health,
        )

    async def list_orgs(
        self,
        *,
        search: str | None = None,
        active: bool | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> AdminOrgListResponse:
        filters = []
        if search:
            q = f"%{search.strip()}%"
            filters.append(Organization.name.ilike(q))
        if active is not None:
            filters.append(Organization.is_active.is_(active))

        count_stmt = select(func.count()).select_from(Organization)
        if filters:
            count_stmt = count_stmt.where(*filters)
        total = int((await self.session.execute(count_stmt)).scalar_one() or 0)

        stmt = (
            select(Organization)
            .order_by(Organization.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if filters:
            stmt = stmt.where(*filters)
        orgs = list((await self.session.execute(stmt)).scalars().all())

        member_counts = {
            row[0]: int(row[1])
            for row in (
                await self.session.execute(
                    select(User.organization_id, func.count())
                    .where(User.organization_id.is_not(None))
                    .group_by(User.organization_id)
                )
            ).all()
        }
        survey_counts = {
            row[0]: int(row[1])
            for row in (
                await self.session.execute(
                    select(Survey.organization_id, func.count()).group_by(
                        Survey.organization_id
                    )
                )
            ).all()
        }

        return AdminOrgListResponse(
            organizations=[
                _org_public(
                    o,
                    member_count=member_counts.get(o.id, 0),
                    survey_count=survey_counts.get(o.id, 0),
                )
                for o in orgs
            ],
            total=total,
        )

    async def get_org(self, org_id: UUID) -> AdminOrgPublic:
        org = await self.orgs.get_by_id(org_id)
        if org is None:
            raise NotFoundError("Organization not found")
        await self.session.refresh(org)
        members = await self.users.count_by_organization(org_id)
        surveys = int(
            (
                await self.session.execute(
                    select(func.count())
                    .select_from(Survey)
                    .where(Survey.organization_id == org_id)
                )
            ).scalar_one()
            or 0
        )
        return _org_public(org, member_count=members, survey_count=surveys)

    async def update_org(
        self, *, actor: User, org_id: UUID, body: AdminOrgUpdate
    ) -> AdminOrgPublic:
        org = await self.orgs.get_by_id(org_id)
        if org is None:
            raise NotFoundError("Organization not found")

        data = body.model_dump(exclude_unset=True)
        if "name" in data and data["name"]:
            org.name = data["name"].strip()
        if "notes" in data:
            text = (data["notes"] or "").strip()
            org.notes = text or None

        if "is_active" in data and data["is_active"] is not None:
            becoming_active = bool(data["is_active"])
            if becoming_active and not org.is_active:
                org.is_active = True
                org.suspended_at = None
                org.suspended_reason = None
                await record_audit(
                    self.session,
                    actor=actor,
                    action="org.reactivate",
                    resource_type="organization",
                    resource_id=org.id,
                    organization_id=org.id,
                )
            elif not becoming_active and org.is_active:
                org.is_active = False
                org.suspended_at = datetime.now(UTC)
                reason = (data.get("suspended_reason") or body.suspended_reason or "").strip()
                org.suspended_reason = reason or "Suspended by platform admin"
                await record_audit(
                    self.session,
                    actor=actor,
                    action="org.suspend",
                    resource_type="organization",
                    resource_id=org.id,
                    organization_id=org.id,
                    metadata={"reason": org.suspended_reason},
                )
        elif "suspended_reason" in data and not org.is_active:
            reason = (data["suspended_reason"] or "").strip()
            org.suspended_reason = reason or org.suspended_reason

        await self.session.commit()
        return await self.get_org(org_id)

    async def get_feature_flags(self, org_id: UUID) -> AdminFeatureFlagsResponse:
        org = await self.orgs.get_by_id(org_id)
        if org is None:
            raise NotFoundError("Organization not found")
        return AdminFeatureFlagsResponse(
            organization_id=org.id, flags=default_flags_map(org.feature_flags)
        )

    async def update_feature_flags(
        self, *, actor: User, org_id: UUID, flags: dict[str, bool]
    ) -> AdminFeatureFlagsResponse:
        org = await self.orgs.get_by_id(org_id)
        if org is None:
            raise NotFoundError("Organization not found")
        cleaned: dict[str, bool] = {}
        for key, value in flags.items():
            if key not in FEATURE_FLAG_KEYS:
                raise BadRequestError(f"Unknown feature flag: {key}")
            cleaned[key] = bool(value)
        # Merge onto existing so unspecified keys stay as-is (enabled by default).
        merged = dict(org.feature_flags or {})
        # Store only explicit disables to keep payload small; True clears key.
        for key, enabled in cleaned.items():
            if enabled:
                merged.pop(key, None)
            else:
                merged[key] = False
        org.feature_flags = merged
        await record_audit(
            self.session,
            actor=actor,
            action="org.feature_flags.update",
            resource_type="organization",
            resource_id=org.id,
            organization_id=org.id,
            metadata={"flags": cleaned},
        )
        await self.session.commit()
        await self.session.refresh(org)
        return AdminFeatureFlagsResponse(
            organization_id=org.id, flags=default_flags_map(org.feature_flags)
        )

    async def list_users(
        self,
        *,
        search: str | None = None,
        role: UserRole | None = None,
        organization_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> AdminUserListResponse:
        filters = []
        if search:
            q = f"%{search.strip()}%"
            filters.append(or_(User.email.ilike(q), User.full_name.ilike(q)))
        if role is not None:
            filters.append(User.role == role)
        if organization_id is not None:
            filters.append(User.organization_id == organization_id)

        count_stmt = select(func.count()).select_from(User)
        if filters:
            count_stmt = count_stmt.where(*filters)
        total = int((await self.session.execute(count_stmt)).scalar_one() or 0)

        stmt = (
            select(User)
            .options(selectinload(User.organization))
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if filters:
            stmt = stmt.where(*filters)
        rows = list((await self.session.execute(stmt)).scalars().all())
        return AdminUserListResponse(
            users=[UserPublic.model_validate(u) for u in rows], total=total
        )

    async def create_user(
        self, *, actor: User, body: AdminUserCreate
    ) -> UserPublic:
        if await self.users.get_by_email(body.email):
            raise ConflictError("Email already registered")

        if body.role == UserRole.system_admin or body.is_superuser:
            if not actor.is_superuser and actor.role != UserRole.system_admin:
                raise ForbiddenError("Only system admins can create platform admins")

        org: Organization | None = None
        if body.organization_id is not None:
            org = await self.orgs.get_by_id(body.organization_id)
            if org is None:
                raise NotFoundError("Organization not found")
        elif body.organization_name:
            org = Organization(name=body.organization_name.strip())
            await self.orgs.add(org)
            await self.session.flush()

        user = User(
            email=body.email.lower().strip(),
            full_name=body.full_name.strip(),
            role=body.role,
            hashed_password=hash_password(body.password),
            organization_id=org.id if org else None,
            is_active=True,
            is_superuser=bool(body.is_superuser)
            or body.role == UserRole.system_admin,
            email_verified=body.email_verified,
        )
        user = await self.users.add(user)
        await record_audit(
            self.session,
            actor=actor,
            action="user.create",
            resource_type="user",
            resource_id=user.id,
            organization_id=user.organization_id,
            metadata={"email": user.email, "role": user.role.value},
        )
        await self.session.commit()
        loaded = await self.users.get_by_id(user.id)
        assert loaded is not None
        return UserPublic.model_validate(loaded)

    async def update_user(
        self, *, actor: User, user_id: UUID, body: AdminUserUpdate
    ) -> UserPublic:
        user = await self.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        if user.id == actor.id and body.is_active is False:
            raise BadRequestError("Cannot deactivate your own account")

        data = body.model_dump(exclude_unset=True)
        if "password" in data and data["password"]:
            user.hashed_password = hash_password(data.pop("password"))
        if "full_name" in data and data["full_name"]:
            user.full_name = data["full_name"].strip()
        if "role" in data and data["role"] is not None:
            new_role = data["role"]
            if new_role == UserRole.system_admin:
                user.is_superuser = True
            user.role = new_role
        if "is_superuser" in data and data["is_superuser"] is not None:
            user.is_superuser = bool(data["is_superuser"])
            if user.is_superuser:
                user.role = UserRole.system_admin
        if "is_active" in data and data["is_active"] is not None:
            user.is_active = bool(data["is_active"])
            if not user.is_active:
                await self.refresh_tokens.revoke_all_for_user(user.id)
        if "email_verified" in data and data["email_verified"] is not None:
            user.email_verified = bool(data["email_verified"])
        if "organization_id" in data:
            org_id = data["organization_id"]
            if org_id is not None:
                org = await self.orgs.get_by_id(org_id)
                if org is None:
                    raise NotFoundError("Organization not found")
            user.organization_id = org_id

        await record_audit(
            self.session,
            actor=actor,
            action="user.update",
            resource_type="user",
            resource_id=user.id,
            organization_id=user.organization_id,
            metadata={k: str(v) for k, v in data.items() if k != "password"},
        )
        await self.session.commit()
        loaded = await self.users.get_by_id(user.id)
        assert loaded is not None
        return UserPublic.model_validate(loaded)

    async def list_audit(
        self,
        *,
        organization_id: UUID | None = None,
        actor_user_id: UUID | None = None,
        action: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> AdminAuditListResponse:
        filters = []
        if organization_id is not None:
            filters.append(AuditLog.organization_id == organization_id)
        if actor_user_id is not None:
            filters.append(AuditLog.actor_user_id == actor_user_id)
        if action:
            filters.append(AuditLog.action.ilike(f"%{action.strip()}%"))

        count_stmt = select(func.count()).select_from(AuditLog)
        if filters:
            count_stmt = count_stmt.where(*filters)
        total = int((await self.session.execute(count_stmt)).scalar_one() or 0)

        stmt = (
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if filters:
            stmt = stmt.where(*filters)
        rows = list((await self.session.execute(stmt)).scalars().all())

        actor_ids = {r.actor_user_id for r in rows if r.actor_user_id}
        emails: dict[UUID, str] = {}
        if actor_ids:
            for u in (
                await self.session.execute(
                    select(User.id, User.email).where(User.id.in_(actor_ids))
                )
            ).all():
                emails[u[0]] = u[1]

        return AdminAuditListResponse(
            items=[
                _audit_item(r, actor_email=emails.get(r.actor_user_id) if r.actor_user_id else None)
                for r in rows
            ],
            total=total,
        )

    async def list_ai_logs(
        self,
        *,
        feature: str | None = None,
        status: str | None = None,
        user_id: UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> AdminAiLogListResponse:
        filters = []
        if feature:
            filters.append(AiGenerationLog.feature == feature.strip())
        if status:
            filters.append(AiGenerationLog.status == status.strip())
        if user_id is not None:
            filters.append(AiGenerationLog.user_id == user_id)

        count_stmt = select(
            func.count(),
            func.count().filter(AiGenerationLog.status != "success"),
        ).select_from(AiGenerationLog)
        if filters:
            count_stmt = count_stmt.where(*filters)
        totals = (await self.session.execute(count_stmt)).one()
        total = int(totals[0] or 0)
        errors = int(totals[1] or 0)
        error_rate = (errors / total) if total else 0.0

        stmt = (
            select(AiGenerationLog)
            .order_by(AiGenerationLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if filters:
            stmt = stmt.where(*filters)
        rows = list((await self.session.execute(stmt)).scalars().all())

        user_ids = {r.user_id for r in rows if r.user_id}
        emails: dict[UUID, str] = {}
        if user_ids:
            for u in (
                await self.session.execute(
                    select(User.id, User.email).where(User.id.in_(user_ids))
                )
            ).all():
                emails[u[0]] = u[1]

        return AdminAiLogListResponse(
            items=[
                AdminAiLogItem(
                    id=r.id,
                    feature=r.feature,
                    user_id=r.user_id,
                    user_email=emails.get(r.user_id) if r.user_id else None,
                    model=r.model,
                    status=r.status,
                    tokens_input=r.tokens_input,
                    tokens_output=r.tokens_output,
                    latency_ms=r.latency_ms,
                    error_message=r.error_message,
                    created_at=r.created_at,
                )
                for r in rows
            ],
            total=total,
            error_rate=error_rate,
        )

    async def inspect_org(self, org_id: UUID) -> AdminOrgInspectResponse:
        org_public = await self.get_org(org_id)
        members_rows = list(
            (
                await self.session.execute(
                    select(User)
                    .where(User.organization_id == org_id)
                    .order_by(User.created_at.asc())
                )
            ).scalars().all()
        )
        members = [
            AdminInspectMember(
                id=m.id,
                email=m.email,
                full_name=m.full_name,
                role=m.role,
                is_active=m.is_active,
            )
            for m in members_rows
        ]

        survey_rows = list(
            (
                await self.session.execute(
                    select(Survey)
                    .where(Survey.organization_id == org_id)
                    .order_by(Survey.updated_at.desc())
                    .limit(40)
                )
            ).scalars().all()
        )
        completed: dict[UUID, int] = {}
        if survey_rows:
            completed = {
                row[0]: int(row[1])
                for row in (
                    await self.session.execute(
                        select(Respondent.survey_id, func.count())
                        .where(
                            Respondent.survey_id.in_([s.id for s in survey_rows]),
                            Respondent.completed_at.is_not(None),
                        )
                        .group_by(Respondent.survey_id)
                    )
                ).all()
            }

        surveys = [
            AdminInspectSurvey(
                id=s.id,
                title=s.title,
                status=s.status if isinstance(s.status, str) else getattr(s.status, "value", str(s.status)),
                response_count=completed.get(s.id, 0),
                updated_at=s.updated_at,
            )
            for s in survey_rows
        ]

        recent = await self.list_audit(organization_id=org_id, skip=0, limit=20)
        return AdminOrgInspectResponse(
            organization=org_public,
            members=members,
            surveys=surveys,
            recent_audit=recent.items,
        )

    async def start_impersonation(
        self, *, actor: User, org_id: UUID
    ) -> AdminImpersonateResponse:
        if not actor.is_superuser and actor.role != UserRole.system_admin:
            raise ForbiddenError()
        org = await self.orgs.get_by_id(org_id)
        if org is None:
            raise NotFoundError("Organization not found")
        if not org.is_active:
            raise BadRequestError("Cannot impersonate a suspended organization")

        owner = (
            await self.session.execute(
                select(User)
                .options(selectinload(User.organization))
                .where(
                    User.organization_id == org_id,
                    User.role == UserRole.organization,
                    User.is_active.is_(True),
                )
                .order_by(User.created_at.asc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if owner is None:
            owner = (
                await self.session.execute(
                    select(User)
                    .options(selectinload(User.organization))
                    .where(
                        User.organization_id == org_id,
                        User.is_active.is_(True),
                        User.role != UserRole.system_admin,
                    )
                    .order_by(User.created_at.asc())
                    .limit(1)
                )
            ).scalar_one_or_none()
        if owner is None:
            raise BadRequestError("No active seat available to impersonate")
        if owner.role == UserRole.system_admin or owner.is_superuser:
            raise ForbiddenError("Cannot impersonate a system admin")

        public_user = UserPublic.model_validate(owner)
        access = create_access_token(
            subject=owner.id,
            role=owner.role.value,
            expires_delta=timedelta(minutes=60),
            extra_claims={
                "impersonation": True,
                "impersonator_id": str(actor.id),
            },
        )
        raw_refresh = create_refresh_token_value()
        refresh_row = RefreshToken(
            user_id=owner.id,
            token_hash=hash_token(raw_refresh),
            expires_at=datetime.now(UTC) + timedelta(hours=1),
        )
        await self.refresh_tokens.add(refresh_row)
        await record_audit(
            self.session,
            actor=actor,
            action="impersonation.start",
            resource_type="organization",
            resource_id=org.id,
            organization_id=org.id,
            metadata={"target_user_id": str(owner.id), "target_email": owner.email},
        )
        await self.session.commit()
        return AdminImpersonateResponse(
            access_token=access,
            refresh_token=raw_refresh,
            user=public_user,
            organization_id=org.id,
            organization_name=org.name,
            impersonator_id=actor.id,
        )

    async def stop_impersonation(
        self, *, actor_admin: User
    ) -> tuple[str, str, UserPublic]:
        """Re-issue tokens for the platform admin after impersonation."""
        loaded = await self.users.get_by_id(actor_admin.id)
        if loaded is None:
            raise NotFoundError("Admin user not found")
        public_user = UserPublic.model_validate(loaded)
        access = create_access_token(subject=loaded.id, role=loaded.role.value)
        raw_refresh = create_refresh_token_value()
        refresh_row = RefreshToken(
            user_id=loaded.id,
            token_hash=hash_token(raw_refresh),
            expires_at=datetime.now(UTC)
            + timedelta(days=settings.refresh_token_expire_days),
        )
        await self.refresh_tokens.add(refresh_row)
        await record_audit(
            self.session,
            actor=loaded,
            action="impersonation.stop",
            resource_type="user",
            resource_id=loaded.id,
            organization_id=loaded.organization_id,
        )
        await self.session.commit()
        return access, raw_refresh, public_user

    def health(self) -> AdminHealthResponse:
        dsn = redis_dsn()
        return AdminHealthResponse(
            status="ok",
            jobs_mode="queue" if dsn else "inline",
            redis_configured=bool((settings.redis_url or "").strip()),
            environment=settings.environment,
        )
