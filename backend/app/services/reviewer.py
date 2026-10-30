"""Reviewer use-cases: run Gemini review, fetch latest, update finding status."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.schemas import ReviewerOutput
from app.ai.services.reviewer import review_survey
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.reviewer import ReviewerFinding, ReviewerFindingStatus, ReviewerReport
from app.models.survey import Question, Survey
from app.models.survey_plan import SurveyPlan
from app.models.user import User
from app.repositories.reviewer import ReviewerFindingRepository, ReviewerReportRepository
from app.repositories.survey import SurveyRepository
from app.repositories.survey_plan import SurveyPlanRepository
from app.schemas.reviewer import (
    FindingStatusUpdate,
    ReviewerFindingPublic,
    ReviewerReportPublic,
    ScoreCriterionPublic,
)


def _require_org(user: User) -> UUID:
    if user.organization_id is None:
        raise ForbiddenError("Organization membership required")
    return user.organization_id


class ReviewerService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.surveys = SurveyRepository(session)
        self.plans = SurveyPlanRepository(session)
        self.reports = ReviewerReportRepository(session)
        self.findings = ReviewerFindingRepository(session)

    async def get_latest(
        self, *, user: User, survey_id: UUID
    ) -> ReviewerReportPublic | None:
        survey = await self._get_owned_survey(user, survey_id)
        report = await self.reports.latest_for_survey(survey_id=survey.id)
        if report is None:
            return None
        return self._report_public(report, survey)

    async def run_review(
        self, *, user: User, survey_id: UUID
    ) -> ReviewerReportPublic:
        survey = await self._get_owned_survey(user, survey_id)
        if not survey.sections or not any(
            (s.questions or []) for s in survey.sections
        ):
            raise BadRequestError(
                "Survey has no questions to review. Generate or add questions first."
            )

        plan: SurveyPlan | None = None
        if survey.plan_id is not None:
            plan = await self.plans.get_for_org(
                plan_id=survey.plan_id, organization_id=_require_org(user)
            )

        q_by_id = self._question_index(survey)
        required_count = sum(
            1
            for q in q_by_id.values()
            if q.is_required
        )

        call = await review_survey(
            plan=self._plan_dict(plan) if plan else None,
            survey=self._survey_prompt_dict(survey, required_count),
            user_id=user.id,
            session=self.session,
        )
        output = call.value
        assert isinstance(output, ReviewerOutput)

        notes = (output.notes or "").strip() or None
        meta = {
            "model": call.model,
            "prompt_version": call.prompt_version,
            "request_id": call.request_id,
            "latency_ms": call.latency_ms,
            "notes": notes,
        }

        score = float(output.overall_quality_score)
        score = max(1.0, min(5.0, score))

        report = ReviewerReport(
            survey_id=survey.id,
            overall_quality_score=round(score, 1),
            estimated_completion_minutes=max(
                1, int(output.estimated_completion_minutes or 1)
            ),
            required_question_count=int(
                output.required_question_count
                if output.required_question_count is not None
                else required_count
            ),
            score_criteria=[
                {
                    "label": c.label.strip() or "Criterion",
                    "score": max(1.0, min(5.0, float(c.score))),
                    "description": c.description.strip(),
                }
                for c in (output.score_criteria or [])
            ],
            ai_generation_meta=meta,
        )
        self.session.add(report)
        await self.session.flush()

        allowed_issues = {
            "leading_wording",
            "double_barreled",
            "ambiguous",
            "objective_misalignment",
            "other",
        }
        for item in output.findings or []:
            qid: UUID | None = None
            raw_id = (item.question_id or "").strip()
            if raw_id:
                try:
                    cand = UUID(raw_id)
                except ValueError:
                    cand = None
                if cand is not None and cand in q_by_id:
                    qid = cand

            rewrite = (item.suggested_rewrite or "").strip() or None
            raw_issue = str(item.issue_type or "").strip()
            issue_type = raw_issue if raw_issue in allowed_issues else "other"
            finding = ReviewerFinding(
                reviewer_report_id=report.id,
                question_id=qid,
                issue_type=issue_type,
                explanation=item.explanation.strip()
                or "Quality concern noted by the reviewer.",
                suggested_rewrite=rewrite,
                status=ReviewerFindingStatus.open.value,
            )
            self.session.add(finding)

        finding_count = len(output.findings or [])
        quality_score = float(report.overall_quality_score)
        org_id = _require_org(user)
        survey_title = survey.title
        await self.session.commit()
        loaded = await self.reports.latest_for_survey(survey_id=survey.id)
        assert loaded is not None

        from app.services.notification import NotificationService

        try:
            await NotificationService(self.session).notify_review_complete(
                organization_id=org_id,
                survey_id=survey.id,
                survey_title=survey_title,
                finding_count=finding_count,
                quality_score=quality_score,
            )
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "review_complete notification failed survey=%s", survey.id
            )

        return self._report_public(loaded, survey)

    async def update_finding_status(
        self, *, user: User, finding_id: UUID, body: FindingStatusUpdate
    ) -> ReviewerFindingPublic:
        org_id = _require_org(user)
        finding = await self.findings.get_for_org_survey(
            finding_id=finding_id, organization_id=org_id
        )
        if finding is None:
            raise NotFoundError("Finding not found")
        survey_id = finding.report.survey_id
        finding.status = body.status
        await self.session.commit()
        await self.session.refresh(finding)

        survey = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=org_id
        )
        assert survey is not None
        return self._finding_public(finding, survey)

    async def _get_owned_survey(self, user: User, survey_id: UUID) -> Survey:
        org_id = _require_org(user)
        survey = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=org_id
        )
        if survey is None:
            raise NotFoundError("Survey not found")
        return survey

    @staticmethod
    def _plan_dict(plan: SurveyPlan) -> dict[str, Any]:
        return {
            "id": str(plan.id),
            "research_goal": plan.research_goal,
            "objectives": list(plan.objectives or []),
            "research_questions": list(plan.research_questions or []),
            "target_respondents": list(plan.target_respondents or []),
        }

    @staticmethod
    def _survey_prompt_dict(survey: Survey, required_count: int) -> dict[str, Any]:
        sections = []
        for s in sorted(survey.sections or [], key=lambda x: x.order_index):
            questions = []
            for q in sorted(s.questions or [], key=lambda x: x.order_index):
                questions.append(
                    {
                        "id": str(q.id),
                        "type": q.type,
                        "prompt_text": q.prompt_text,
                        "is_required": q.is_required,
                        "options": q.options,
                    }
                )
            sections.append({"title": s.title, "questions": questions})
        return {
            "id": str(survey.id),
            "title": survey.title,
            "required_question_count": required_count,
            "sections": sections,
        }

    @staticmethod
    def _question_index(survey: Survey) -> dict[UUID, Question]:
        out: dict[UUID, Question] = {}
        for s in survey.sections or []:
            for q in s.questions or []:
                out[q.id] = q
        return out

    def _report_public(
        self, report: ReviewerReport, survey: Survey
    ) -> ReviewerReportPublic:
        criteria_raw = report.score_criteria or []
        criteria: list[ScoreCriterionPublic] = []
        for c in criteria_raw:
            if isinstance(c, dict):
                criteria.append(
                    ScoreCriterionPublic(
                        label=str(c.get("label") or "Criterion"),
                        score=float(c.get("score") or 0),
                        description=str(c.get("description") or ""),
                    )
                )

        findings = [
            self._finding_public(f, survey)
            for f in (report.findings or [])
        ]
        meta = report.ai_generation_meta or {}
        notes = meta.get("notes") if isinstance(meta, dict) else None
        notes_str = notes.strip() if isinstance(notes, str) and notes.strip() else None
        return ReviewerReportPublic(
            id=report.id,
            survey_id=report.survey_id,
            overall_quality_score=(
                float(report.overall_quality_score)
                if report.overall_quality_score is not None
                else None
            ),
            estimated_completion_minutes=report.estimated_completion_minutes,
            required_question_count=report.required_question_count,
            score_criteria=criteria,
            findings=findings,
            ai_generation_meta=report.ai_generation_meta,
            notes=notes_str,
            created_at=report.created_at,
        )

    def _finding_public(
        self, finding: ReviewerFinding, survey: Survey
    ) -> ReviewerFindingPublic:
        q_text: str | None = None
        section_title: str | None = None
        if finding.question_id is not None:
            for s in survey.sections or []:
                for q in s.questions or []:
                    if q.id == finding.question_id:
                        q_text = q.prompt_text
                        section_title = s.title
                        break
        allowed_issues = {
            "leading_wording",
            "double_barreled",
            "ambiguous",
            "objective_misalignment",
            "other",
        }
        issue = finding.issue_type if finding.issue_type in allowed_issues else "other"
        status = (
            finding.status
            if finding.status in {"open", "accepted", "dismissed"}
            else "open"
        )
        return ReviewerFindingPublic(
            id=finding.id,
            reviewer_report_id=finding.reviewer_report_id,
            question_id=finding.question_id,
            question_text=q_text,
            section_title=section_title,
            issue_type=issue,  # type: ignore[arg-type]
            explanation=finding.explanation,
            suggested_rewrite=finding.suggested_rewrite,
            status=status,  # type: ignore[arg-type]
            created_at=finding.created_at,
        )
