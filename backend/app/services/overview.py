"""Org-level dashboard aggregates for the overview page."""

from __future__ import annotations

from calendar import month_abbr
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get_json, cache_set_json
from app.core.config import settings
from app.core.exceptions import ForbiddenError
from app.models.collection import Respondent
from app.models.report import Report
from app.models.survey import Survey, SurveyStatus
from app.models.survey_plan import SurveyPlan
from app.models.user import User
from app.schemas.overview import (
    OverviewActivityPoint,
    OverviewAttentionItem,
    OverviewKpi,
    OverviewLifecycleStage,
    OverviewResponse,
)


def _require_org(user: User) -> UUID:
    if user.organization_id is None:
        raise ForbiddenError("Organization account required")
    return user.organization_id


def _month_key(dt: datetime | str) -> str:
    if isinstance(dt, str):
        return dt[:7] if len(dt) >= 7 else dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).strftime("%Y-%m")


def _month_label(key: str) -> str:
    _year, month = key.split("-")
    return month_abbr[int(month)]


def _month_bucket(session: AsyncSession, column):  # noqa: ANN001
    """Month bucket portable across Postgres (date_trunc) and SQLite tests."""
    bind = session.bind
    dialect = getattr(getattr(bind, "dialect", None), "name", None)
    if dialect == "sqlite" or (
        dialect is None and "sqlite" in settings.database_url.lower()
    ):
        return func.strftime("%Y-%m", column)
    month_unit = literal_column("'month'")
    return func.date_trunc(month_unit, column)


def _fmt_int(n: int) -> str:
    return f"{n:,}"


def _delta_count(current: int, previous: int, *, unit: str) -> tuple[str, str]:
    diff = current - previous
    if diff > 0:
        return f"+{diff} {unit}", "up"
    if diff < 0:
        return f"{diff} {unit}", "down"
    return f"0 {unit}", "flat"


class OverviewService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_overview(self, *, user: User) -> OverviewResponse:
        org_id = _require_org(user)
        cache_key = f"overview:v1:{org_id}"
        cached = await cache_get_json(cache_key)
        if isinstance(cached, dict):
            try:
                return OverviewResponse.model_validate(cached)
            except Exception:
                pass

        overview = await self._build_overview(org_id=org_id)
        await cache_set_json(
            cache_key,
            overview.model_dump(mode="json"),
            ttl_seconds=max(5, settings.overview_cache_ttl_seconds),
        )
        return overview

    async def _build_overview(self, *, org_id: UUID) -> OverviewResponse:
        now = datetime.now(UTC)
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if this_month_start.month == 1:
            prev_month_start = this_month_start.replace(
                year=this_month_start.year - 1, month=12
            )
        else:
            prev_month_start = this_month_start.replace(month=this_month_start.month - 1)

        # Rolling 12 calendar months inclusive of current month.
        series_start = this_month_start
        for _ in range(11):
            if series_start.month == 1:
                series_start = series_start.replace(year=series_start.year - 1, month=12)
            else:
                series_start = series_start.replace(month=series_start.month - 1)

        # Collapse many count round-trips into a few filtered aggregates.
        survey_row = (
            await self.session.execute(
                select(
                    func.count(),
                    func.count().filter(Survey.created_at >= this_month_start),
                    func.count().filter(
                        Survey.created_at >= prev_month_start,
                        Survey.created_at < this_month_start,
                    ),
                    func.count().filter(Survey.status == SurveyStatus.draft.value),
                    func.count().filter(Survey.status == SurveyStatus.published.value),
                )
                .select_from(Survey)
                .where(Survey.organization_id == org_id)
            )
        ).one()
        surveys_total = int(survey_row[0] or 0)
        surveys_this = int(survey_row[1] or 0)
        surveys_prev = int(survey_row[2] or 0)
        draft_total = int(survey_row[3] or 0)
        collecting_total = int(survey_row[4] or 0)

        report_row = (
            await self.session.execute(
                select(
                    func.count(),
                    func.count().filter(Report.created_at >= this_month_start),
                    func.count().filter(
                        Report.created_at >= prev_month_start,
                        Report.created_at < this_month_start,
                    ),
                    func.count(func.distinct(Report.survey_id)),
                )
                .select_from(Report)
                .join(Survey, Survey.id == Report.survey_id)
                .where(Survey.organization_id == org_id)
            )
        ).one()
        reports_total = int(report_row[0] or 0)
        reports_this = int(report_row[1] or 0)
        reports_prev = int(report_row[2] or 0)
        with_reports = int(report_row[3] or 0)

        respondent_totals = (
            await self.session.execute(
                select(
                    func.count(),
                    func.count().filter(Respondent.completed_at.is_not(None)),
                    func.count(func.distinct(Respondent.survey_id)).filter(
                        Respondent.completed_at.is_not(None)
                    ),
                    func.count().filter(Respondent.completed_at >= this_month_start),
                    func.count().filter(
                        Respondent.completed_at >= prev_month_start,
                        Respondent.completed_at < this_month_start,
                    ),
                )
                .select_from(Respondent)
                .join(Survey, Survey.id == Respondent.survey_id)
                .where(Survey.organization_id == org_id)
            )
        ).one()
        lifetime_started = int(respondent_totals[0] or 0)
        lifetime_completed = int(respondent_totals[1] or 0)
        with_responses = int(respondent_totals[2] or 0)
        completed_this = int(respondent_totals[3] or 0)
        completed_prev = int(respondent_totals[4] or 0)

        plans_total = int(
            (
                await self.session.execute(
                    select(func.count())
                    .select_from(SurveyPlan)
                    .where(SurveyPlan.organization_id == org_id)
                )
            ).scalar_one()
            or 0
        )

        # Month buckets in SQL — avoid shipping every respondent row over the wire.
        # Use a SQL literal for the trunc unit so SELECT/GROUP BY stay identical
        # under asyncpg (bound params $1 vs $4 are not considered equal by PG).
        started_month = _month_bucket(self.session, Respondent.started_at)
        completed_month = _month_bucket(self.session, Respondent.completed_at)
        started_by_month: dict[str, int] = {
            _month_key(row[0]): int(row[1])
            for row in (
                await self.session.execute(
                    select(started_month, func.count())
                    .join(Survey, Survey.id == Respondent.survey_id)
                    .where(
                        Survey.organization_id == org_id,
                        Respondent.started_at >= series_start,
                    )
                    .group_by(started_month)
                )
            ).all()
        }
        completed_by_month: dict[str, int] = {
            _month_key(row[0]): int(row[1])
            for row in (
                await self.session.execute(
                    select(completed_month, func.count())
                    .join(Survey, Survey.id == Respondent.survey_id)
                    .where(
                        Survey.organization_id == org_id,
                        Respondent.completed_at.is_not(None),
                        Respondent.completed_at >= series_start,
                    )
                    .group_by(completed_month)
                )
            ).all()
        }

        completion_rate = (
            lifetime_completed / lifetime_started if lifetime_started else 0.0
        )

        survey_delta, survey_trend = _delta_count(
            surveys_this, surveys_prev, unit="this month"
        )
        response_delta, response_trend = _delta_count(
            completed_this, completed_prev, unit="this month"
        )
        report_delta, report_trend = _delta_count(
            reports_this, reports_prev, unit="this month"
        )

        kpis = [
            OverviewKpi(
                label="Total Surveys",
                value=_fmt_int(surveys_total),
                delta=survey_delta,
                hint="In your workspace",
                trend=survey_trend,
            ),
            OverviewKpi(
                label="Total Responses",
                value=_fmt_int(lifetime_completed),
                delta=response_delta,
                hint="Completed submissions",
                trend=response_trend,
            ),
            OverviewKpi(
                label="Reports Generated",
                value=_fmt_int(reports_total),
                delta=report_delta,
                hint="AI reports saved",
                trend=report_trend,
            ),
        ]

        activity: list[OverviewActivityPoint] = []
        cursor = series_start
        for _ in range(12):
            key = cursor.strftime("%Y-%m")
            activity.append(
                OverviewActivityPoint(
                    month=key,
                    label=_month_label(key),
                    started=started_by_month.get(key, 0),
                    completed=completed_by_month.get(key, 0),
                )
            )
            if cursor.month == 12:
                cursor = cursor.replace(year=cursor.year + 1, month=1)
            else:
                cursor = cursor.replace(month=cursor.month + 1)

        lifecycle = [
            OverviewLifecycleStage(key="plan", label="Plan", count=plans_total),
            OverviewLifecycleStage(key="review", label="Review", count=draft_total),
            OverviewLifecycleStage(
                key="collect", label="Collect", count=collecting_total
            ),
            OverviewLifecycleStage(
                key="analytics", label="Analytics", count=with_responses
            ),
            OverviewLifecycleStage(key="report", label="Report", count=with_reports),
        ]
        attention = await self._attention_items(org_id=org_id)

        return OverviewResponse(
            kpis=kpis,
            activity=activity,
            surveys_total=surveys_total,
            responses_total=lifetime_completed,
            reports_total=reports_total,
            completion_rate=completion_rate,
            lifecycle=lifecycle,
            attention=attention,
        )

    async def _attention_items(
        self, *, org_id: UUID
    ) -> list[OverviewAttentionItem]:
        completed_by_survey: dict[UUID, int] = {
            row[0]: int(row[1])
            for row in (
                await self.session.execute(
                    select(Respondent.survey_id, func.count())
                    .join(Survey, Survey.id == Respondent.survey_id)
                    .where(
                        Survey.organization_id == org_id,
                        Respondent.completed_at.is_not(None),
                    )
                    .group_by(Respondent.survey_id)
                )
            ).all()
        }

        # DISTINCT ON (Postgres) — one latest report per survey.
        report_rows = (
            await self.session.execute(
                select(
                    Report.id,
                    Report.survey_id,
                    Report.title,
                    Report.metrics_snapshot,
                    Report.created_at,
                    Survey.title,
                )
                .distinct(Report.survey_id)
                .join(Survey, Survey.id == Report.survey_id)
                .where(Survey.organization_id == org_id)
                .order_by(Report.survey_id, Report.created_at.desc())
            )
        ).all()

        latest_report_by_survey: dict[UUID, tuple] = {
            row[1]: row for row in report_rows
        }

        # Cap attention scan — newest surveys first (enough for the 6-item feed).
        surveys = (
            await self.session.execute(
                select(
                    Survey.id,
                    Survey.title,
                    Survey.status,
                    Survey.updated_at,
                    Survey.plan_id,
                )
                .where(Survey.organization_id == org_id)
                .order_by(Survey.updated_at.desc())
                .limit(40)
            )
        ).all()

        linked_plan_ids = {row[4] for row in surveys if row[4] is not None}

        unlinked_stmt = (
            select(SurveyPlan.id, SurveyPlan.research_goal, SurveyPlan.updated_at)
            .where(SurveyPlan.organization_id == org_id)
            .order_by(SurveyPlan.updated_at.desc())
            .limit(8)
        )
        if linked_plan_ids:
            unlinked_stmt = unlinked_stmt.where(SurveyPlan.id.notin_(linked_plan_ids))
        unlinked_plans = (await self.session.execute(unlinked_stmt)).all()

        attention: list[OverviewAttentionItem] = []

        for report_id, survey_id, report_title, snap, _created, survey_title in (
            latest_report_by_survey.values()
        ):
            snapshot_n = int((snap or {}).get("response_count") or 0)
            live_n = completed_by_survey.get(survey_id, 0)
            if live_n > snapshot_n:
                attention.append(
                    OverviewAttentionItem(
                        id=f"stale:{report_id}",
                        kind="stale_report",
                        title=survey_title or report_title,
                        detail=(
                            f"Report snapshot is stale ({snapshot_n} → {live_n} "
                            "responses)"
                        ),
                        href=f"/dashboard/surveys/{survey_id}/reports",
                        survey_id=survey_id,
                    )
                )

        for survey_id, title, status, _updated, _plan_id in surveys:
            completed = completed_by_survey.get(survey_id, 0)
            if (
                status in (SurveyStatus.published.value, SurveyStatus.closed.value)
                and completed > 0
                and survey_id not in latest_report_by_survey
            ):
                attention.append(
                    OverviewAttentionItem(
                        id=f"ready:{survey_id}",
                        kind="ready_for_report",
                        title=title,
                        detail=f"{completed:,} completed · generate a report",
                        href=f"/dashboard/surveys/{survey_id}/reports",
                        survey_id=survey_id,
                    )
                )

        for survey_id, title, status, _updated, _plan_id in surveys:
            if status != SurveyStatus.published.value:
                continue
            completed = completed_by_survey.get(survey_id, 0)
            if completed == 0:
                attention.append(
                    OverviewAttentionItem(
                        id=f"empty:{survey_id}",
                        kind="no_responses",
                        title=title,
                        detail="Live survey with no completed responses yet",
                        href=f"/dashboard/surveys/{survey_id}/collect",
                        survey_id=survey_id,
                    )
                )

        for survey_id, title, status, _updated, _plan_id in surveys:
            if status != SurveyStatus.draft.value:
                continue
            attention.append(
                OverviewAttentionItem(
                    id=f"draft:{survey_id}",
                    kind="draft",
                    title=title,
                    detail="Draft questionnaire — continue reviewing",
                    href=f"/dashboard/surveys/{survey_id}/review",
                    survey_id=survey_id,
                )
            )

        for plan_id, goal, _updated in unlinked_plans:
            short = (goal or "Untitled plan").strip().replace("\n", " ")
            if len(short) > 72:
                short = f"{short[:69]}…"
            attention.append(
                OverviewAttentionItem(
                    id=f"plan:{plan_id}",
                    kind="plan_ready",
                    title=short,
                    detail="Research plan ready — generate survey questions",
                    href=f"/dashboard/plans/{plan_id}",
                    survey_id=None,
                )
            )

        return attention[:6]
