"""Survey builder use-cases: CRUD + Gemini draft / section regenerate."""

from __future__ import annotations

import re
import uuid
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.schemas import (
    DraftQuestion,
    DraftSection,
    SectionDraftOutput,
    SurveyDraftOutput,
)
from app.ai.services.builder import generate_survey_draft, regenerate_section
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.survey import Question, QuestionSource, QuestionType, Section, Survey, SurveyStatus
from app.models.survey_plan import SurveyPlan
from app.models.user import User
from app.repositories.reviewer import ReviewerReportRepository
from app.repositories.survey import QuestionRepository, SectionRepository, SurveyRepository
from app.repositories.survey_plan import SurveyPlanRepository
from app.schemas.survey import (
    QuestionCreate,
    QuestionPublic,
    QuestionReorder,
    QuestionUpdate,
    SectionCreate,
    SectionPublic,
    SectionReorder,
    SectionUpdate,
    SurveyCreate,
    SurveyCreateFromPlan,
    SurveyGenerateResponse,
    SurveyListResponse,
    SurveyPublic,
    SurveyUpdate,
)


def _require_org(user: User) -> None:
    if user.organization_id is None:
        raise ForbiddenError("Organization account required")


def _slug_value(label: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", label.strip().lower()).strip("_")
    return slug or "option"


def _options_from_labels(labels: list[str] | None) -> list[dict[str, str]] | None:
    if not labels:
        return None
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for label in labels:
        text = str(label).strip()
        if not text:
            continue
        base = _slug_value(text)
        value = base
        n = 2
        while value in seen:
            value = f"{base}_{n}"
            n += 1
        seen.add(value)
        out.append({"id": str(uuid.uuid4()), "label": text, "value": value})
    return out or None


def _default_validation(qtype: str) -> dict[str, Any] | None:
    if qtype == QuestionType.rating_scale.value:
        return {"min": 1, "max": 5}
    return None


def _question_public(q: Question) -> QuestionPublic:
    return QuestionPublic(
        id=q.id,
        section_id=q.section_id,
        survey_id=q.survey_id,
        type=q.type,  # type: ignore[arg-type]
        prompt_text=q.prompt_text,
        help_text=q.help_text,
        is_required=q.is_required,
        order_index=q.order_index,
        options=q.options,
        validation_rules=q.validation_rules,
        conditional_logic=q.conditional_logic,
        source=q.source,  # type: ignore[arg-type]
        ai_generation_meta=q.ai_generation_meta,
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


def _section_public(s: Section) -> SectionPublic:
    questions = sorted(s.questions or [], key=lambda q: q.order_index)
    return SectionPublic(
        id=s.id,
        survey_id=s.survey_id,
        title=s.title,
        description=s.description,
        order_index=s.order_index,
        questions=[_question_public(q) for q in questions],
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


def _survey_public(survey: Survey) -> SurveyPublic:
    sections = sorted(survey.sections or [], key=lambda s: s.order_index)
    return SurveyPublic(
        id=survey.id,
        plan_id=survey.plan_id,
        organization_id=survey.organization_id,
        created_by=survey.created_by,
        title=survey.title,
        description=survey.description,
        status=survey.status,  # type: ignore[arg-type]
        anonymous_collection=survey.anonymous_collection,
        current_version_id=survey.current_version_id,
        sections=[_section_public(s) for s in sections],
        created_at=survey.created_at,
        updated_at=survey.updated_at,
    )


def _plan_to_prompt_dict(plan: SurveyPlan) -> dict[str, Any]:
    return {
        "id": str(plan.id),
        "research_goal": plan.research_goal,
        "objectives": list(plan.objectives or []),
        "research_questions": list(plan.research_questions or []),
        "target_respondents": list(plan.target_respondents or []),
        "proposed_sections": list(plan.proposed_sections or []),
        "estimated_length_minutes": plan.estimated_length_minutes,
    }


def _validate_draft_tree(sections: list[DraftSection]) -> None:
    """Enforce shape Gemini structured-output no longer constrains via JSON Schema."""
    if not sections:
        raise BadRequestError("AI returned no survey sections")
    if len(sections) > 12:
        raise BadRequestError("AI returned too many sections")
    for section in sections:
        if not section.title.strip():
            raise BadRequestError("AI returned a section with an empty title")
        if not section.questions:
            raise BadRequestError(f"Section '{section.title}' has no questions")
        if len(section.questions) > 20:
            raise BadRequestError(f"Section '{section.title}' has too many questions")
        for q in section.questions:
            if not q.prompt_text.strip():
                raise BadRequestError("AI returned a question with empty prompt text")
            if len(q.options) > 20:
                raise BadRequestError("AI returned a question with too many options")


def _build_question(
    *,
    survey_id: UUID,
    section_id: UUID,
    draft: DraftQuestion,
    order_index: int,
    meta: dict[str, Any] | None,
) -> Question:
    qtype = draft.type
    if qtype not in {t.value for t in QuestionType}:
        raise BadRequestError(f"Unsupported question type: {qtype}")

    choice_types = {
        QuestionType.single_choice.value,
        QuestionType.multiple_choice.value,
        QuestionType.dropdown.value,
    }
    options = _options_from_labels(draft.options)
    if qtype in choice_types and not options:
        raise BadRequestError(
            f"Choice question requires options: {draft.prompt_text[:80]}"
        )

    return Question(
        survey_id=survey_id,
        section_id=section_id,
        type=qtype,
        prompt_text=draft.prompt_text.strip(),
        help_text=draft.help_text.strip() if draft.help_text else None,
        is_required=bool(draft.is_required),
        order_index=order_index,
        options=options,
        validation_rules=_default_validation(qtype),
        conditional_logic=None,
        source=QuestionSource.ai_generated.value,
        ai_generation_meta=meta,
    )


class SurveyService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.surveys = SurveyRepository(session)
        self.sections = SectionRepository(session)
        self.questions = QuestionRepository(session)
        self.plans = SurveyPlanRepository(session)
        self.review_reports = ReviewerReportRepository(session)

    async def list_surveys(self, *, user: User) -> SurveyListResponse:
        _require_org(user)
        assert user.organization_id is not None
        rows = await self.surveys.list_for_org(organization_id=user.organization_id)
        total = await self.surveys.count_for_org(organization_id=user.organization_id)
        return SurveyListResponse(
            surveys=[_survey_public(s) for s in rows], total=total
        )

    async def get_survey(self, *, user: User, survey_id: UUID) -> SurveyPublic:
        survey = await self._get_owned(user, survey_id)
        return _survey_public(survey)

    async def create_survey(self, *, user: User, body: SurveyCreate) -> SurveyPublic:
        _require_org(user)
        assert user.organization_id is not None
        plan_id = body.plan_id
        if plan_id is not None:
            await self._get_owned_plan(user, plan_id)
            existing = await self.surveys.get_by_plan_id(
                plan_id=plan_id, organization_id=user.organization_id
            )
            if existing is not None:
                raise BadRequestError(
                    "This plan already has a survey. Open that survey and "
                    "regenerate questions instead of creating another."
                )

        survey = Survey(
            created_by=user.id,
            organization_id=user.organization_id,
            plan_id=plan_id,
            title=body.title.strip(),
            description=body.description.strip() if body.description else None,
            status=SurveyStatus.draft.value,
            anonymous_collection=body.anonymous_collection,
        )
        await self.surveys.add(survey)
        await self.session.commit()
        return await self.get_survey(user=user, survey_id=survey.id)

    async def create_from_plan(
        self, *, user: User, body: SurveyCreateFromPlan
    ) -> tuple[SurveyGenerateResponse, bool]:
        """Get-or-create the single survey for a plan; optionally hard-replace draft.

        One plan → one survey id forever. Re-running generate deletes prior
        sections/questions and writes a fresh tree (no merge / no leak).

        Returns (payload, created_new).
        """
        _require_org(user)
        assert user.organization_id is not None
        plan = await self._get_owned_plan(user, body.plan_id)
        title = (body.title or plan.research_goal[:80]).strip()
        if not title:
            title = "Untitled survey"

        existing = await self.surveys.get_by_plan_id(
            plan_id=plan.id, organization_id=user.organization_id
        )
        if existing is not None:
            # Keep the same survey id — update title/description if provided.
            if body.title is not None and title:
                existing.title = title
            if body.description is not None:
                existing.description = (
                    body.description.strip() if body.description else None
                )
            await self.session.commit()
            survey_id = existing.id
            if not body.generate:
                return (
                    SurveyGenerateResponse(
                        survey=await self.get_survey(
                            user=user, survey_id=survey_id
                        ),
                        notes=None,
                    ),
                    False,
                )
            return await self.generate(user=user, survey_id=survey_id), False

        created = await self.create_survey(
            user=user,
            body=SurveyCreate(
                title=title,
                description=body.description,
                plan_id=plan.id,
            ),
        )
        if not body.generate:
            return SurveyGenerateResponse(survey=created, notes=None), True
        return await self.generate(user=user, survey_id=created.id), True

    async def update_survey(
        self, *, user: User, survey_id: UUID, body: SurveyUpdate
    ) -> SurveyPublic:
        survey = await self._get_owned(user, survey_id)
        data = body.model_dump(exclude_unset=True)
        if "title" in data and data["title"] is not None:
            survey.title = data["title"].strip()
        if "description" in data:
            desc = data["description"]
            survey.description = desc.strip() if isinstance(desc, str) else desc
        if "status" in data and data["status"] is not None:
            # Publish/close must go through CollectionService (creates a version).
            if data["status"] in {
                SurveyStatus.published.value,
                SurveyStatus.closed.value,
            }:
                raise BadRequestError(
                    "Use POST /surveys/{id}/publish or /close to change status."
                )
            survey.status = data["status"]
        if "anonymous_collection" in data and data["anonymous_collection"] is not None:
            survey.anonymous_collection = data["anonymous_collection"]
        await self.session.commit()
        return await self.get_survey(user=user, survey_id=survey_id)

    async def delete_survey(self, *, user: User, survey_id: UUID) -> None:
        survey = await self._get_owned(user, survey_id)
        await self.surveys.delete(survey)
        await self.session.commit()

    async def generate(
        self, *, user: User, survey_id: UUID
    ) -> SurveyGenerateResponse:
        """Hard-replace all sections/questions from the linked approved plan (BLD-01)."""
        survey = await self._get_owned(user, survey_id)
        if survey.plan_id is None:
            raise BadRequestError("Survey has no linked plan to generate from.")

        plan = await self._get_owned_plan(user, survey.plan_id)
        self._assert_plan_ready(plan)

        call = await generate_survey_draft(
            plan=_plan_to_prompt_dict(plan),
            user_id=user.id,
            session=self.session,
        )
        output = call.value
        assert isinstance(output, SurveyDraftOutput)
        _validate_draft_tree(output.sections)

        meta = {
            "model": call.model,
            "prompt_version": call.prompt_version,
            "request_id": call.request_id,
            "latency_ms": call.latency_ms,
        }

        survey_id = survey.id
        # Hard replace — prior review findings reference deleted questions.
        await self.review_reports.delete_for_survey(survey_id=survey_id)
        await self.surveys.delete_all_sections(survey_id=survey_id)

        for s_idx, draft_section in enumerate(output.sections):
            section = Section(
                survey_id=survey_id,
                title=draft_section.title.strip(),
                description=None,
                order_index=s_idx,
            )
            self.session.add(section)
            await self.session.flush()
            for q_idx, draft_q in enumerate(draft_section.questions):
                self.session.add(
                    _build_question(
                        survey_id=survey_id,
                        section_id=section.id,
                        draft=draft_q,
                        order_index=q_idx,
                        meta=meta,
                    )
                )

        await self.session.execute(
            Survey.__table__.update()
            .where(Survey.id == survey_id)
            .values(status=SurveyStatus.draft.value)
        )
        await self.session.commit()
        # Expire only the survey row — expire_all() would detach CurrentUser attrs.
        self.session.expire(survey)
        public = await self.get_survey(user=user, survey_id=survey_id)
        return SurveyGenerateResponse(survey=public, notes=output.notes)

    async def regenerate_section_ai(
        self, *, user: User, survey_id: UUID, section_id: UUID
    ) -> SurveyGenerateResponse:
        """Hard-replace questions in one section; leave others untouched (BLD-02)."""
        survey = await self._get_owned(user, survey_id)
        if survey.plan_id is None:
            raise BadRequestError("Survey has no linked plan to regenerate from.")

        plan = await self._get_owned_plan(user, survey.plan_id)
        self._assert_plan_ready(plan)

        section = await self.sections.get_for_survey(
            section_id=section_id, survey_id=survey.id
        )
        if section is None:
            raise NotFoundError("Section not found")

        other_titles = [
            s.title
            for s in sorted(survey.sections or [], key=lambda x: x.order_index)
            if s.id != section.id
        ]

        call = await regenerate_section(
            plan=_plan_to_prompt_dict(plan),
            section_title=section.title,
            section_description=section.description,
            other_section_titles=other_titles,
            user_id=user.id,
            session=self.session,
        )
        output = call.value
        assert isinstance(output, SectionDraftOutput)
        _validate_draft_tree(
            [DraftSection(title=output.title, questions=output.questions)]
        )

        meta = {
            "model": call.model,
            "prompt_version": call.prompt_version,
            "request_id": call.request_id,
            "latency_ms": call.latency_ms,
        }

        survey_id = survey.id
        section_id = section.id
        # Questionnaire changed — drop advisory review until re-run.
        await self.review_reports.delete_for_survey(survey_id=survey_id)
        await self.sections.delete_questions(section_id=section_id)
        section.title = output.title.strip()
        for q_idx, draft_q in enumerate(output.questions):
            self.session.add(
                _build_question(
                    survey_id=survey_id,
                    section_id=section_id,
                    draft=draft_q,
                    order_index=q_idx,
                    meta=meta,
                )
            )

        await self.session.commit()
        self.session.expire(survey)
        self.session.expire(section)
        public = await self.get_survey(user=user, survey_id=survey_id)
        return SurveyGenerateResponse(survey=public, notes=output.notes)

    # ---- Manual section CRUD (BLD-05–08) ----

    async def add_section(
        self, *, user: User, survey_id: UUID, body: SectionCreate
    ) -> SectionPublic:
        survey = await self._get_owned(user, survey_id)
        order = body.order_index
        if order is None:
            order = len(survey.sections or [])
        section = Section(
            survey_id=survey.id,
            title=body.title.strip(),
            description=body.description.strip() if body.description else None,
            order_index=order,
        )
        await self.sections.add(section)
        await self.session.commit()
        loaded = await self.sections.get_for_survey(
            section_id=section.id, survey_id=survey.id
        )
        assert loaded is not None
        return _section_public(loaded)

    async def update_section(
        self,
        *,
        user: User,
        survey_id: UUID,
        section_id: UUID,
        body: SectionUpdate,
    ) -> SectionPublic:
        await self._get_owned(user, survey_id)
        section = await self.sections.get_for_survey(
            section_id=section_id, survey_id=survey_id
        )
        if section is None:
            raise NotFoundError("Section not found")
        data = body.model_dump(exclude_unset=True)
        if "title" in data and data["title"] is not None:
            section.title = data["title"].strip()
        if "description" in data:
            desc = data["description"]
            section.description = desc.strip() if isinstance(desc, str) else desc
        if "order_index" in data and data["order_index"] is not None:
            section.order_index = data["order_index"]
        await self.session.commit()
        loaded = await self.sections.get_for_survey(
            section_id=section_id, survey_id=survey_id
        )
        assert loaded is not None
        return _section_public(loaded)

    async def delete_section(
        self, *, user: User, survey_id: UUID, section_id: UUID
    ) -> None:
        await self._get_owned(user, survey_id)
        section = await self.sections.get_for_survey(
            section_id=section_id, survey_id=survey_id
        )
        if section is None:
            raise NotFoundError("Section not found")
        await self.sections.delete(section)
        await self.session.commit()

    async def reorder_sections(
        self, *, user: User, survey_id: UUID, body: SectionReorder
    ) -> SurveyPublic:
        survey = await self._get_owned(user, survey_id)
        by_id = {s.id: s for s in (survey.sections or [])}
        if set(body.section_ids) != set(by_id.keys()):
            raise BadRequestError("section_ids must include every section exactly once")
        for idx, sid in enumerate(body.section_ids):
            by_id[sid].order_index = idx
        await self.session.commit()
        return await self.get_survey(user=user, survey_id=survey_id)

    async def add_question(
        self, *, user: User, survey_id: UUID, body: QuestionCreate
    ) -> QuestionPublic:
        await self._get_owned(user, survey_id)
        section = await self.sections.get_for_survey(
            section_id=body.section_id, survey_id=survey_id
        )
        if section is None:
            raise NotFoundError("Section not found")
        order = body.order_index
        if order is None:
            order = len(section.questions or [])
        options = None
        if body.options is not None:
            options = [o.model_dump() for o in body.options]
        question = Question(
            survey_id=survey_id,
            section_id=body.section_id,
            type=body.type,
            prompt_text=body.prompt_text.strip(),
            help_text=body.help_text.strip() if body.help_text else None,
            is_required=body.is_required,
            order_index=order,
            options=options,
            validation_rules=body.validation_rules or _default_validation(body.type),
            conditional_logic=body.conditional_logic,
            source=QuestionSource.manual.value,
        )
        await self.questions.add(question)
        await self.session.commit()
        await self.session.refresh(question)
        return _question_public(question)

    async def update_question(
        self,
        *,
        user: User,
        survey_id: UUID,
        question_id: UUID,
        body: QuestionUpdate,
    ) -> QuestionPublic:
        await self._get_owned(user, survey_id)
        question = await self.questions.get_for_survey(
            question_id=question_id, survey_id=survey_id
        )
        if question is None:
            raise NotFoundError("Question not found")
        data = body.model_dump(exclude_unset=True)
        if "type" in data and data["type"] is not None:
            question.type = data["type"]
        if "prompt_text" in data and data["prompt_text"] is not None:
            question.prompt_text = data["prompt_text"].strip()
        if "help_text" in data:
            ht = data["help_text"]
            question.help_text = ht.strip() if isinstance(ht, str) else ht
        if "is_required" in data and data["is_required"] is not None:
            question.is_required = data["is_required"]
        if "order_index" in data and data["order_index"] is not None:
            question.order_index = data["order_index"]
        if "options" in data:
            opts = data["options"]
            if opts is None:
                question.options = None
            else:
                question.options = [
                    o if isinstance(o, dict) else o.model_dump() for o in opts
                ]
        if "validation_rules" in data:
            question.validation_rules = data["validation_rules"]
        if "conditional_logic" in data:
            question.conditional_logic = data["conditional_logic"]
        if "source" in data and data["source"] is not None:
            question.source = data["source"]
        elif question.source == QuestionSource.ai_generated.value:
            # Manual edit of an AI question → mark as ai_edited (BLD-03 editable)
            question.source = QuestionSource.ai_edited.value
        await self.session.commit()
        await self.session.refresh(question)
        return _question_public(question)

    async def delete_question(
        self, *, user: User, survey_id: UUID, question_id: UUID
    ) -> None:
        await self._get_owned(user, survey_id)
        question = await self.questions.get_for_survey(
            question_id=question_id, survey_id=survey_id
        )
        if question is None:
            raise NotFoundError("Question not found")
        await self.questions.delete(question)
        await self.session.commit()

    async def reorder_questions(
        self, *, user: User, survey_id: UUID, body: QuestionReorder
    ) -> SurveyPublic:
        await self._get_owned(user, survey_id)
        section = await self.sections.get_for_survey(
            section_id=body.section_id, survey_id=survey_id
        )
        if section is None:
            raise NotFoundError("Section not found")
        by_id = {q.id: q for q in (section.questions or [])}
        if set(body.question_ids) != set(by_id.keys()):
            raise BadRequestError(
                "question_ids must include every question in the section exactly once"
            )
        for idx, qid in enumerate(body.question_ids):
            by_id[qid].order_index = idx
        await self.session.commit()
        return await self.get_survey(user=user, survey_id=survey_id)

    # ---- helpers ----

    def _assert_plan_ready(self, plan: SurveyPlan) -> None:
        if not (plan.objectives and plan.research_questions and plan.proposed_sections):
            raise BadRequestError(
                "Plan needs objectives, research questions, and proposed sections "
                "before generating a survey draft."
            )
        if len((plan.research_goal or "").strip()) < 10:
            raise BadRequestError("Plan research goal is too short.")

    async def _get_owned(self, user: User, survey_id: UUID) -> Survey:
        _require_org(user)
        assert user.organization_id is not None
        survey = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=user.organization_id
        )
        if survey is None:
            raise NotFoundError("Survey not found")
        return survey

    async def _get_owned_plan(self, user: User, plan_id: UUID) -> SurveyPlan:
        _require_org(user)
        assert user.organization_id is not None
        plan = await self.plans.get_for_org(
            plan_id=plan_id, organization_id=user.organization_id
        )
        if plan is None:
            raise NotFoundError("Plan not found")
        return plan
