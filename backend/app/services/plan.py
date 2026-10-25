"""Survey plan use-cases: CRUD, approve, Gemini generate."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.ai.schemas import SurveyPlanOutput
from app.ai.services.planner import generate_survey_plan
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.survey import Survey
from app.models.survey_plan import PlanStatus, SurveyPlan
from app.models.user import User
from app.repositories.survey import SurveyRepository
from app.repositories.survey_plan import SurveyPlanRepository
from app.schemas.plan import (
    PlanCreate,
    PlanListResponse,
    PlanPublic,
    PlanUpdate,
    ProposedSectionPublic,
    SurveyPlanGenerateResponse,
)

_PLAN_LOCKED_MSG = (
    "This plan is locked because survey questions have already been generated. "
    "Edit questions on the Review tab instead."
)


def _require_org(user: User) -> None:
    if user.organization_id is None:
        raise ForbiddenError("Organization account required")


def _survey_has_questions(survey: Survey | None) -> bool:
    if survey is None:
        return False
    return any((s.questions or []) for s in (survey.sections or []))


def _to_public(
    plan: SurveyPlan,
    *,
    is_locked: bool = False,
    linked_survey_id=None,
) -> PlanPublic:
    normalized: list[ProposedSectionPublic] = []
    for s in plan.proposed_sections or []:
        if isinstance(s, ProposedSectionPublic):
            normalized.append(s)
        else:
            normalized.append(ProposedSectionPublic.model_validate(s))
    return PlanPublic(
        id=plan.id,
        created_by=plan.created_by,
        organization_id=plan.organization_id,
        research_goal=plan.research_goal,
        objectives=list(plan.objectives or []),
        research_questions=list(plan.research_questions or []),
        target_respondents=list(plan.target_respondents or []),
        proposed_sections=normalized,
        estimated_length_minutes=plan.estimated_length_minutes,
        status=plan.status,
        ai_generation_meta=plan.ai_generation_meta,
        is_locked=is_locked,
        linked_survey_id=linked_survey_id,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


class PlanService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.plans = SurveyPlanRepository(session)
        self.surveys = SurveyRepository(session)

    async def list_plans(self, *, user: User) -> PlanListResponse:
        _require_org(user)
        assert user.organization_id is not None
        rows = await self.plans.list_for_org(organization_id=user.organization_id)
        link_meta = await self._plan_link_meta(
            organization_id=user.organization_id,
            plan_ids=[p.id for p in rows],
        )
        return PlanListResponse(
            plans=[
                _to_public(
                    p,
                    is_locked=link_meta.get(p.id, (False, None))[0],
                    linked_survey_id=link_meta.get(p.id, (False, None))[1],
                )
                for p in rows
            ],
            total=await self.plans.count_for_org(organization_id=user.organization_id),
        )

    async def get_plan(self, *, user: User, plan_id) -> PlanPublic:
        plan = await self._get_owned(user, plan_id)
        return await self._to_public_with_lock(user=user, plan=plan)

    async def create_plan(self, *, user: User, body: PlanCreate) -> PlanPublic:
        _require_org(user)
        plan = SurveyPlan(
            created_by=user.id,
            organization_id=user.organization_id,
            research_goal=body.research_goal.strip(),
            objectives=[],
            research_questions=[],
            target_respondents=[],
            proposed_sections=[],
            status=PlanStatus.draft.value,
        )
        await self.plans.add(plan)
        await self.session.commit()
        await self.session.refresh(plan)
        return _to_public(plan, is_locked=False)

    async def update_plan(
        self, *, user: User, plan_id, body: PlanUpdate
    ) -> PlanPublic:
        plan = await self._get_owned(user, plan_id)
        await self._ensure_unlocked(user=user, plan=plan)
        data = body.model_dump(exclude_unset=True)
        if "research_goal" in data and data["research_goal"] is not None:
            plan.research_goal = data["research_goal"].strip()
        if "objectives" in data and data["objectives"] is not None:
            plan.objectives = data["objectives"]
        if "research_questions" in data and data["research_questions"] is not None:
            plan.research_questions = data["research_questions"]
        if "target_respondents" in data and data["target_respondents"] is not None:
            plan.target_respondents = data["target_respondents"]
        if "proposed_sections" in data and data["proposed_sections"] is not None:
            plan.proposed_sections = data["proposed_sections"]
        if "estimated_length_minutes" in data:
            plan.estimated_length_minutes = data["estimated_length_minutes"]
        if "status" in data and data["status"] is not None:
            plan.status = data["status"]
        await self.session.commit()
        await self.session.refresh(plan)
        return await self._to_public_with_lock(user=user, plan=plan)

    async def approve_plan(self, *, user: User, plan_id) -> PlanPublic:
        plan = await self._get_owned(user, plan_id)
        if not (plan.objectives and plan.research_questions and plan.proposed_sections):
            raise BadRequestError(
                "Approve requires objectives, research questions, and proposed sections."
            )
        plan.status = PlanStatus.approved.value
        await self.session.commit()
        await self.session.refresh(plan)
        return await self._to_public_with_lock(user=user, plan=plan)

    async def generate(
        self,
        *,
        user: User,
        plan_id,
        research_goal: str | None = None,
    ) -> SurveyPlanGenerateResponse:
        """Hard-replace AI fields on the plan — never merge with prior content."""
        plan = await self._get_owned(user, plan_id)
        await self._ensure_unlocked(user=user, plan=plan)
        if research_goal is not None:
            plan.research_goal = research_goal.strip()

        goal = plan.research_goal.strip()
        if len(goal) < 10:
            raise BadRequestError("Research goal is too short to generate a plan.")

        call = await generate_survey_plan(
            research_goal=goal,
            user_id=user.id,
            session=self.session,
        )
        output = call.value
        assert isinstance(output, SurveyPlanOutput)

        # Hard replace — assign fresh lists/dicts so prior content cannot linger.
        plan.objectives = list(output.objectives)
        plan.research_questions = list(output.research_questions)
        plan.target_respondents = list(output.target_respondents)
        plan.proposed_sections = [
            dict(s.model_dump()) for s in output.proposed_sections
        ]
        plan.estimated_length_minutes = output.estimated_length_minutes
        plan.status = PlanStatus.draft.value
        plan.ai_generation_meta = {
            "model": call.model,
            "prompt_version": call.prompt_version,
            "request_id": call.request_id,
            "latency_ms": call.latency_ms,
        }
        for col in (
            "objectives",
            "research_questions",
            "target_respondents",
            "proposed_sections",
            "ai_generation_meta",
        ):
            flag_modified(plan, col)

        await self.session.commit()
        await self.session.refresh(plan)

        public = await self._to_public_with_lock(user=user, plan=plan)
        return SurveyPlanGenerateResponse(
            plan=public,
            objectives=list(public.objectives),
            research_questions=list(public.research_questions),
            target_respondents=list(public.target_respondents),
            proposed_sections=list(public.proposed_sections),
            estimated_length_minutes=public.estimated_length_minutes
            or output.estimated_length_minutes,
            notes=output.notes,
        )

    async def create_and_generate(
        self, *, user: User, body: PlanCreate
    ) -> SurveyPlanGenerateResponse:
        """Create a draft plan then immediately run the planner (New Survey flow)."""
        created = await self.create_plan(user=user, body=body)
        return await self.generate(user=user, plan_id=created.id)

    async def _get_owned(self, user: User, plan_id) -> SurveyPlan:
        _require_org(user)
        assert user.organization_id is not None
        plan = await self.plans.get_for_org(
            plan_id=plan_id, organization_id=user.organization_id
        )
        if plan is None:
            raise NotFoundError("Plan not found")
        return plan

    async def _linked_survey(self, *, user: User, plan_id) -> Survey | None:
        assert user.organization_id is not None
        return await self.surveys.get_by_plan_id(
            plan_id=plan_id, organization_id=user.organization_id
        )

    async def _ensure_unlocked(self, *, user: User, plan: SurveyPlan) -> None:
        survey = await self._linked_survey(user=user, plan_id=plan.id)
        if _survey_has_questions(survey):
            raise BadRequestError(_PLAN_LOCKED_MSG)

    async def _to_public_with_lock(
        self, *, user: User, plan: SurveyPlan
    ) -> PlanPublic:
        survey = await self._linked_survey(user=user, plan_id=plan.id)
        return _to_public(
            plan,
            is_locked=_survey_has_questions(survey),
            linked_survey_id=survey.id if survey is not None else None,
        )

    async def _plan_link_meta(
        self, *, organization_id, plan_ids: list
    ) -> dict:
        """plan_id -> (is_locked, linked_survey_id)."""
        meta: dict = {}
        for plan_id in plan_ids:
            survey = await self.surveys.get_by_plan_id(
                plan_id=plan_id, organization_id=organization_id
            )
            meta[plan_id] = (
                _survey_has_questions(survey),
                survey.id if survey is not None else None,
            )
        return meta
