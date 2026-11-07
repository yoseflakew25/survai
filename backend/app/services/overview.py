"""Org-level dashboard aggregates for the overview page."""

from __future__ import annotations

from calendar import month_abbr
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
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


def _month_key(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).strftime("%Y-%m")


def _month_label(key: str) -> str:
    _year, month = key.split("-")
    return month_abbr[int(month)]


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

        surveys_total = await self._scalar(
            select(func.count())
            .select_from(Survey)
            .where(Survey.organization_id == org_id)
        )
        surveys_this = await self._scalar(
            select(func.count())
            .select_from(Survey)
            .where(
                Survey.organization_id == org_id,
                Survey.created_at >= this_month_start,
            )
        )
        surveys_prev = await self._scalar(
            select(func.count())
            .select_from(Survey)
            .where(
                Survey.organization_id == org_id,
                Survey.created_at >= prev_month_start,
                Survey.created_at < this_month_start,
            )
        )

        reports_total = await self._scalar(
            select(func.count())
            .select_from(Report)
            .join(Survey, Survey.id == Report.survey_id)
            .where(Survey.organization_id == org_id)
        )
        reports_this = await self._scalar(
            select(func.count())
            .select_from(Report)
            .join(Survey, Survey.id == Report.survey_id)
            .where(
                Survey.organization_id == org_id,
                Report.created_at >= this_month_start,
            )
        )
        reports_prev = await self._scalar(
            select(func.count())
            .select_from(Report)
            .join(Survey, Survey.id == Report.survey_id)
            .where(
                Survey.organization_id == org_id,
                Report.created_at >= prev_month_start,
                Report.created_at < this_month_start,
            )
        )

        respondent_rows = (
            await self.session.execute(
                select(Respondent.started_at, Respondent.completed_at)
                .join(Survey, Survey.id == Respondent.survey_id)
                .where(
                    Survey.organization_id == org_id,
                    Respondent.started_at >= series_start,
                )
            )
        ).all()

        started_by_month: dict[str, int] = {}
        completed_by_month: dict[str, int] = {}
        started_this = 0
        completed_this = 0
        started_prev = 0
        completed_prev = 0

        for started_at, completed_at in respondent_rows:
            sk = _month_key(started_at)
            started_by_month[sk] = started_by_month.get(sk, 0) + 1
            if started_at >= this_month_start:
                started_this += 1
            elif started_at >= prev_month_start:
                started_prev += 1

            if completed_at is not None:
                ck = _month_key(completed_at)
                completed_by_month[ck] = completed_by_month.get(ck, 0) + 1
                if completed_at >= this_month_start:
                    completed_this += 1
                elif completed_at >= prev_month_start:
                    completed_prev += 1

        # Lifetime totals (not only last 12 months) for KPI cards.
        lifetime_started = await self._scalar(
            select(func.count())
            .select_from(Respondent)
            .join(Survey, Survey.id == Respondent.survey_id)
            .where(Survey.organization_id == org_id)
        )
        lifetime_completed = await self._scalar(
            select(func.count())
            .select_from(Respondent)
            .join(Survey, Survey.id == Respondent.survey_id)
            .where(
                Survey.organization_id == org_id,
                Respondent.completed_at.is_not(None),
            )
        )

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

        lifecycle, attention = await self._lifecycle_and_attention(org_id=org_id)

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

    async def _lifecycle_and_attention(
        self, *, org_id: UUID
    ) -> tuple[list[OverviewLifecycleStage], list[OverviewAttentionItem]]:
        plans_total = await self._scalar(
            select(func.count())
            .select_from(SurveyPlan)
            .where(SurveyPlan.organization_id == org_id)
        )
        draft_total = await self._scalar(
            select(func.count())
            .select_from(Survey)
            .where(
                Survey.organization_id == org_id,
                Survey.status == SurveyStatus.draft.value,
            )
        )
        collecting_total = await self._scalar(
            select(func.count())
            .select_from(Survey)
            .where(
                Survey.organization_id == org_id,
                Survey.status == SurveyStatus.published.value,
            )
        )
        with_responses = await self._scalar(
            select(func.count(func.distinct(Respondent.survey_id)))
            .select_from(Respondent)
            .join(Survey, Survey.id == Respondent.survey_id)
            .where(
                Survey.organization_id == org_id,
                Respondent.completed_at.is_not(None),
            )
        )
        with_reports = await self._scalar(
            select(func.count(func.distinct(Report.survey_id)))
            .select_from(Report)
            .join(Survey, Survey.id == Report.survey_id)
            .where(Survey.organization_id == org_id)
        )

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
                .join(Survey, Survey.id == Report.survey_id)
                .where(Survey.organization_id == org_id)
                .order_by(Report.created_at.desc())
            )
        ).all()

        latest_report_by_survey: dict[UUID, tuple] = {}
        for row in report_rows:
            sid = row[1]
            if sid not in latest_report_by_survey:
                latest_report_by_survey[sid] = row

        surveys = (
            await self.session.execute(
                select(Survey.id, Survey.title, Survey.status, Survey.updated_at)
                .where(Survey.organization_id == org_id)
                .order_by(Survey.updated_at.desc())
            )
        ).all()

        linked_plan_ids = {
            row[0]
            for row in (
                await self.session.execute(
                    select(Survey.plan_id).where(
                        Survey.organization_id == org_id,
                        Survey.plan_id.is_not(None),
                    )
                )
            ).all()
            if row[0] is not None
        }

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

        for survey_id, title, status, _updated in surveys:
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

        for survey_id, title, status, _updated in surveys:
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

        for survey_id, title, status, _updated in surveys:
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

        # Keep order of priority already appended; cap list.
        return lifecycle, attention[:6]

    async def _scalar(self, stmt) -> int:  # noqa: ANN001
        result = await self.session.execute(stmt)
        return int(result.scalar_one() or 0)
