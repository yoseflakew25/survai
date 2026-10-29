"""Analytics service — load version frame + run deterministic engine."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.engine import (
    AnalyticsFrame,
    avg_completion_minutes,
    completion_rate,
    cross_tab,
    distribution_question_ids,
    median_completion_minutes,
    minutes_between,
    percent_distribution,
    questions_from_snapshot,
    response_count,
)
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.user import User
from app.repositories.collection import (
    RespondentRepository,
    ResponseAnswerRepository,
    SurveyVersionRepository,
)
from app.repositories.survey import SurveyRepository
from app.schemas.analytics import (
    AnalyticsFilter,
    AnalyticsQueryRequest,
    AnalyticsQueryResponse,
    AnalyticsSummaryPublic,
    CrossTabCellPublic,
    CrossTabRequest,
    CrossTabResultPublic,
    DistributionBucketPublic,
    MetricValuePublic,
    QuestionDistributionPublic,
)


def _require_org(user: User) -> UUID:
    if user.organization_id is None:
        raise ForbiddenError("Organization account required")
    return user.organization_id


def _answer_matches(raw: Any, filt: AnalyticsFilter) -> bool:
    op = filt.op
    expected = filt.value
    if op == "eq":
        if isinstance(raw, list):
            return expected in raw
        return raw == expected
    if op == "in":
        allowed = expected if isinstance(expected, list) else [expected]
        if isinstance(raw, list):
            return any(item in allowed for item in raw)
        return raw in allowed
    if op == "gt":
        try:
            return float(raw) > float(expected)
        except (TypeError, ValueError):
            return False
    if op == "lt":
        try:
            return float(raw) < float(expected)
        except (TypeError, ValueError):
            return False
    if op == "between":
        if not isinstance(expected, list | tuple) or len(expected) != 2:
            return False
        try:
            v = float(raw)
            return float(expected[0]) <= v <= float(expected[1])
        except (TypeError, ValueError):
            return False
    return False


class AnalyticsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.surveys = SurveyRepository(session)
        self.versions = SurveyVersionRepository(session)
        self.respondents = RespondentRepository(session)
        self.answers = ResponseAnswerRepository(session)

    async def summary(
        self, *, user: User, survey_id: UUID
    ) -> AnalyticsSummaryPublic:
        frame = await self._load_frame(user=user, survey_id=survey_id, filters=[])
        completed = response_count(frame)
        rate = completion_rate(frame)
        avg_m = avg_completion_minutes(frame)
        med_m = median_completion_minutes(frame)

        metrics: list[MetricValuePublic] = [
            MetricValuePublic(
                key="total_responses",
                label="Total Responses",
                value=completed,
                unit="count",
            ),
            MetricValuePublic(
                key="completion_rate",
                label="Completion Rate",
                value=rate,
                unit="percent",
            ),
            MetricValuePublic(
                key="started_count",
                label="Started Sessions",
                value=frame.started_count,
                unit="count",
            ),
        ]
        if avg_m is not None:
            metrics.append(
                MetricValuePublic(
                    key="avg_time",
                    label="Avg. Time",
                    value=avg_m,
                    unit="mean",
                )
            )
        if med_m is not None:
            metrics.append(
                MetricValuePublic(
                    key="median_time",
                    label="Median Time",
                    value=med_m,
                    unit="median",
                )
            )

        return AnalyticsSummaryPublic(
            survey_id=frame.survey_id,
            survey_version_id=frame.survey_version_id,
            response_count=completed,
            completion_rate=rate,
            avg_completion_minutes=avg_m,
            metrics=metrics,
        )

    async def query_distributions(
        self, *, user: User, survey_id: UUID, body: AnalyticsQueryRequest
    ) -> AnalyticsQueryResponse:
        frame = await self._load_frame(
            user=user, survey_id=survey_id, filters=body.filters
        )
        qids = distribution_question_ids(
            frame.questions, only=body.question_ids
        )
        distributions = [
            self._map_distribution(percent_distribution(frame, qid)) for qid in qids
        ]
        return AnalyticsQueryResponse(
            survey_id=frame.survey_id,
            survey_version_id=frame.survey_version_id,
            distributions=distributions,
        )

    async def crosstab(
        self, *, user: User, survey_id: UUID, body: CrossTabRequest
    ) -> CrossTabResultPublic:
        frame = await self._load_frame(
            user=user, survey_id=survey_id, filters=body.filters
        )
        try:
            result = cross_tab(frame, body.question_a_id, body.question_b_id)
        except KeyError as exc:
            raise NotFoundError(str(exc)) from exc
        except ValueError as exc:
            raise BadRequestError(str(exc)) from exc

        return CrossTabResultPublic(
            question_a_id=result.question_a_id,
            question_a_text=result.question_a_text,
            question_b_id=result.question_b_id,
            question_b_text=result.question_b_text,
            row_labels=list(result.row_labels),
            col_labels=list(result.col_labels),
            cells=[
                CrossTabCellPublic(
                    row_label=c.row_label,
                    col_label=c.col_label,
                    count=c.count,
                    percent=c.percent,
                )
                for c in result.cells
            ],
            total_responses=result.total_responses,
        )

    def _map_distribution(self, dist: Any) -> QuestionDistributionPublic:
        return QuestionDistributionPublic(
            question_id=dist.question_id,
            question_text=dist.question_text,
            question_type=dist.question_type,
            total_responses=dist.total_responses,
            missing_count=dist.missing_count,
            buckets=[
                DistributionBucketPublic(
                    label=b.label, value=b.value, percent=b.percent
                )
                for b in dist.buckets
            ],
            denominator=dist.denominator,
        )

    async def _load_frame(
        self,
        *,
        user: User,
        survey_id: UUID,
        filters: list[AnalyticsFilter],
    ) -> AnalyticsFrame:
        org_id = _require_org(user)
        # Meta only — structure comes from the version snapshot, not live draft.
        survey = await self.surveys.get_for_org_meta(
            survey_id=survey_id, organization_id=org_id
        )
        if survey is None:
            raise NotFoundError("Survey not found")
        if survey.current_version_id is None:
            raise BadRequestError(
                "Publish the survey before viewing analytics."
            )

        # Same live version as Collect + Respondents — no silent fallback.
        version = await self.versions.get_by_id(survey.current_version_id)
        if version is None:
            raise NotFoundError("Survey version not found")

        questions = questions_from_snapshot(version.structure_snapshot or {})
        # Same AsyncSession — must stay sequential (no concurrent awaits).
        respondents = await self.respondents.list_for_version(
            survey_version_id=version.id
        )
        all_answers = await self.answers.list_for_version(
            survey_version_id=version.id
        )

        answers_by_respondent: dict[UUID, dict[UUID, Any]] = {}
        for ans in all_answers:
            answers_by_respondent.setdefault(ans.respondent_id, {})[
                ans.question_id
            ] = ans.answer_value

        completed_answers: dict[UUID, dict[UUID, Any]] = {}
        completion_mins: list[float] = []
        for resp in respondents:
            if resp.completed_at is None:
                continue
            row = answers_by_respondent.get(resp.id, {})
            if filters and not self._passes_filters(row, filters):
                continue
            completed_answers[resp.id] = row
            completion_mins.append(
                minutes_between(resp.started_at, resp.completed_at)
            )

        return AnalyticsFrame(
            survey_id=survey.id,
            survey_version_id=version.id,
            started_count=len(respondents),
            completed_count=len(completed_answers),
            answers=completed_answers,
            completion_minutes=completion_mins,
            questions=questions,
        )

    @staticmethod
    def _passes_filters(
        answers: dict[UUID, Any], filters: list[AnalyticsFilter]
    ) -> bool:
        for filt in filters:
            raw = answers.get(filt.question_id)
            if not _answer_matches(raw, filt):
                return False
        return True
