"""Org-level dashboard aggregates for the overview page."""

from __future__ import annotations

from calendar import month_abbr
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError
from app.models.collection import Respondent
from app.models.report import Report
from app.models.survey import Survey
from app.models.user import User
from app.schemas.overview import OverviewActivityPoint, OverviewKpi, OverviewResponse


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


def _fmt_pct(rate: float) -> str:
    return f"{rate * 100:.1f}%"


def _delta_count(current: int, previous: int, *, unit: str) -> tuple[str, str]:
    diff = current - previous
    if diff > 0:
        return f"+{diff} {unit}", "up"
    if diff < 0:
        return f"{diff} {unit}", "down"
    return f"0 {unit}", "flat"


def _delta_rate(current: float, previous: float) -> tuple[str, str]:
    pts = (current - previous) * 100
    if abs(pts) < 0.05:
        return "0.0 pts", "flat"
    sign = "+" if pts > 0 else ""
    trend = "up" if pts > 0 else "down"
    return f"{sign}{pts:.1f} pts", trend


class OverviewService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_overview(self, *, user: User) -> OverviewResponse:
        org_id = _require_org(user)
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
        prev_rate = (
            completed_prev / started_prev if started_prev else completion_rate
        )
        # Prefer month-over-month when both periods have starts; else flat.
        rate_for_delta_current = (
            completed_this / started_this if started_this else completion_rate
        )
        rate_for_delta_previous = prev_rate if started_prev else rate_for_delta_current

        survey_delta, survey_trend = _delta_count(
            surveys_this, surveys_prev, unit="this month"
        )
        response_delta, response_trend = _delta_count(
            completed_this, completed_prev, unit="this month"
        )
        report_delta, report_trend = _delta_count(
            reports_this, reports_prev, unit="this month"
        )
        rate_delta, rate_trend = _delta_rate(
            rate_for_delta_current, rate_for_delta_previous
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
            OverviewKpi(
                label="Completion Rate",
                value=_fmt_pct(completion_rate),
                delta=rate_delta,
                hint="Completed / started",
                trend=rate_trend,
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

        return OverviewResponse(
            kpis=kpis,
            activity=activity,
            surveys_total=surveys_total,
            responses_total=lifetime_completed,
            reports_total=reports_total,
            completion_rate=completion_rate,
        )

    async def _scalar(self, stmt) -> int:  # noqa: ANN001
        result = await self.session.execute(stmt)
        return int(result.scalar_one() or 0)
