"""Light survey comparison — same instrument family, match by prompt text."""

from __future__ import annotations

import re
import uuid
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.core.rbac import require_org_editor
from app.models.survey import Question, Section, Survey, SurveyStatus
from app.models.user import User
from app.repositories.survey import SurveyRepository
from app.schemas.analytics import AnalyticsQueryRequest
from app.schemas.compare import (
    CompareQuestionPair,
    CompareSurveyRef,
    SurveyCompareResponse,
)
from app.schemas.survey import SurveyPublic
from app.services.analytics import AnalyticsService
from app.services.survey import SurveyService

_WS = re.compile(r"\s+")


def _norm_prompt(text: str) -> str:
    return _WS.sub(" ", (text or "").strip().lower())


def _require_org(user: User) -> UUID:
    if user.organization_id is None:
        raise ForbiddenError("Organization account required")
    return user.organization_id


class CompareService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.surveys = SurveyRepository(session)
        self.analytics = AnalyticsService(session)
        self.survey_svc = SurveyService(session)

    async def duplicate_as_endline(
        self, *, user: User, survey_id: UUID
    ) -> SurveyPublic:
        require_org_editor(user)
        org_id = _require_org(user)
        source = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=org_id
        )
        if source is None:
            raise NotFoundError("Survey not found")

        if source.instrument_family_id is None:
            source.instrument_family_id = uuid.uuid4()
        if not source.wave_label:
            source.wave_label = "baseline"
        await self.session.flush()

        # Reload with tree for copy (family/wave already flushed)
        source = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=org_id
        )
        assert source is not None

        new_survey = Survey(
            created_by=user.id,
            organization_id=org_id,
            plan_id=None,
            title=f"{source.title} (Endline)",
            description=source.description,
            status=SurveyStatus.draft.value,
            anonymous_collection=source.anonymous_collection,
            instrument_family_id=source.instrument_family_id,
            wave_label="endline",
            response_quota=source.response_quota,
        )
        self.session.add(new_survey)
        await self.session.flush()

        for sec in sorted(source.sections or [], key=lambda s: s.order_index):
            new_sec = Section(
                survey_id=new_survey.id,
                title=sec.title,
                description=sec.description,
                order_index=sec.order_index,
            )
            self.session.add(new_sec)
            await self.session.flush()
            for q in sorted(sec.questions or [], key=lambda x: x.order_index):
                self.session.add(
                    Question(
                        section_id=new_sec.id,
                        survey_id=new_survey.id,
                        type=q.type,
                        prompt_text=q.prompt_text,
                        help_text=q.help_text,
                        is_required=q.is_required,
                        order_index=q.order_index,
                        options=q.options,
                        validation_rules=q.validation_rules,
                        conditional_logic=q.conditional_logic,
                        source=q.source,
                    )
                )

        await self.session.commit()
        return await self.survey_svc.get_survey(user=user, survey_id=new_survey.id)

    async def compare(
        self, *, user: User, survey_id: UUID, other_id: UUID
    ) -> SurveyCompareResponse:
        org_id = _require_org(user)
        a = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=org_id
        )
        b = await self.surveys.get_for_org(
            survey_id=other_id, organization_id=org_id
        )
        if a is None or b is None:
            raise NotFoundError("Survey not found")
        if a.instrument_family_id is None or b.instrument_family_id is None:
            raise BadRequestError(
                "Both surveys need an instrument family — use Duplicate as endline"
            )
        if a.instrument_family_id != b.instrument_family_id:
            raise BadRequestError("Surveys are not in the same instrument family")

        # Prefer baseline/endline labels; else treat survey_id as baseline.
        if (a.wave_label or "").lower() == "endline" and (
            b.wave_label or ""
        ).lower() != "endline":
            baseline, endline = b, a
        else:
            baseline, endline = a, b

        async def _response_count(sid: UUID) -> int:
            try:
                return (await self.analytics.summary(user=user, survey_id=sid)).response_count
            except (BadRequestError, NotFoundError):
                return 0

        base_count = await _response_count(baseline.id)
        end_count = await _response_count(endline.id)

        base_dist = await self._dist_map(user, baseline.id)
        end_dist = await self._dist_map(user, endline.id)

        base_prompts = {
            _norm_prompt(q.prompt_text): q
            for q in self._flat_questions(baseline)
        }
        end_prompts = {
            _norm_prompt(q.prompt_text): q
            for q in self._flat_questions(endline)
        }

        pairs: list[CompareQuestionPair] = []
        unmatched_b: list[str] = []
        unmatched_e: list[str] = []

        for key, bq in base_prompts.items():
            eq = end_prompts.get(key)
            if eq is None:
                unmatched_b.append(bq.prompt_text)
                continue
            pairs.append(
                CompareQuestionPair(
                    prompt_text=bq.prompt_text,
                    baseline_question_id=bq.id,
                    endline_question_id=eq.id,
                    baseline_distribution=base_dist.get(str(bq.id), []),
                    endline_distribution=end_dist.get(str(eq.id), []),
                )
            )
        for key, eq in end_prompts.items():
            if key not in base_prompts:
                unmatched_e.append(eq.prompt_text)

        return SurveyCompareResponse(
            family_id=baseline.instrument_family_id,
            baseline=CompareSurveyRef(
                id=baseline.id,
                title=baseline.title,
                wave_label=baseline.wave_label,
                response_count=base_count,
                status=baseline.status,
            ),
            endline=CompareSurveyRef(
                id=endline.id,
                title=endline.title,
                wave_label=endline.wave_label,
                response_count=end_count,
                status=endline.status,
            ),
            unmatched_baseline=unmatched_b,
            unmatched_endline=unmatched_e,
            pairs=pairs,
        )

    def _flat_questions(self, survey: Survey) -> list[Question]:
        out: list[Question] = []
        for sec in sorted(survey.sections or [], key=lambda s: s.order_index):
            out.extend(sorted(sec.questions or [], key=lambda q: q.order_index))
        return out

    async def _dist_map(
        self, user: User, survey_id: UUID
    ) -> dict[str, list[dict[str, Any]]]:
        try:
            result = await self.analytics.query_distributions(
                user=user,
                survey_id=survey_id,
                body=AnalyticsQueryRequest(),
            )
        except BadRequestError:
            return {}
        out: dict[str, list[dict[str, Any]]] = {}
        for qd in result.distributions or []:
            out[str(qd.question_id)] = [
                {
                    "label": b.label,
                    "count": b.value,
                    "percent": b.percent,
                }
                for b in (qd.buckets or [])
            ]
        return out
