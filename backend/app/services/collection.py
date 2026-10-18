"""Publish + public collection use-cases (COL-01–05)."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.collection import Respondent, ResponseAnswer, SurveyVersion
from app.models.survey import Survey, SurveyStatus
from app.models.user import User
from app.repositories.collection import (
    RespondentRepository,
    ResponseAnswerRepository,
    SurveyVersionRepository,
)
from app.repositories.survey import SurveyRepository
from app.schemas.collection import (
    CollectStatsPublic,
    CompleteBody,
    PublicQuestionOut,
    PublicSectionOut,
    PublicSurveyOut,
    PublishResponse,
    RespondentPublic,
)


def _require_org(user: User) -> UUID:
    if user.organization_id is None:
        raise ForbiddenError("Organization membership required")
    return user.organization_id


def _hash_ip(ip: str | None) -> str | None:
    if not ip:
        return None
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()


def _snapshot_from_survey(survey: Survey) -> dict[str, Any]:
    sections = []
    for s in sorted(survey.sections or [], key=lambda x: x.order_index):
        questions = []
        for q in sorted(s.questions or [], key=lambda x: x.order_index):
            questions.append(
                {
                    "id": str(q.id),
                    "type": q.type,
                    "prompt_text": q.prompt_text,
                    "help_text": q.help_text,
                    "is_required": q.is_required,
                    "order_index": q.order_index,
                    "options": q.options,
                    "validation_rules": q.validation_rules,
                    "conditional_logic": q.conditional_logic,
                }
            )
        sections.append(
            {
                "id": str(s.id),
                "title": s.title,
                "description": s.description,
                "order_index": s.order_index,
                "questions": questions,
            }
        )
    return {
        "survey_id": str(survey.id),
        "title": survey.title,
        "description": survey.description,
        "anonymous_collection": survey.anonymous_collection,
        "sections": sections,
    }


def _question_index_from_snapshot(
    snapshot: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for section in snapshot.get("sections") or []:
        for q in section.get("questions") or []:
            qid = str(q.get("id") or "")
            if qid:
                out[qid] = q
    return out


def _public_from_version(
    version: SurveyVersion, *, anonymous_collection: bool
) -> PublicSurveyOut:
    snap = version.structure_snapshot or {}
    sections_out: list[PublicSectionOut] = []
    for s in snap.get("sections") or []:
        qs: list[PublicQuestionOut] = []
        for q in s.get("questions") or []:
            qs.append(
                PublicQuestionOut(
                    id=UUID(str(q["id"])),
                    type=str(q.get("type") or "short_text"),
                    prompt_text=str(q.get("prompt_text") or ""),
                    help_text=q.get("help_text"),
                    is_required=bool(q.get("is_required")),
                    order_index=int(q.get("order_index") or 0),
                    options=q.get("options"),
                    validation_rules=q.get("validation_rules"),
                    conditional_logic=q.get("conditional_logic"),
                )
            )
        qs.sort(key=lambda x: x.order_index)
        sections_out.append(
            PublicSectionOut(
                id=UUID(str(s["id"])),
                title=str(s.get("title") or ""),
                description=s.get("description"),
                order_index=int(s.get("order_index") or 0),
                questions=qs,
            )
        )
    sections_out.sort(key=lambda x: x.order_index)
    return PublicSurveyOut(
        id=version.survey_id,
        survey_version_id=version.id,
        title=str(snap.get("title") or ""),
        description=snap.get("description"),
        anonymous_collection=bool(
            snap.get("anonymous_collection", anonymous_collection)
        ),
        sections=sections_out,
    )


def _validate_answer_value(question: dict[str, Any], value: Any) -> Any:
    """Light server-side checks; required-ness is enforced at complete."""
    qtype = str(question.get("type") or "")
    rules = question.get("validation_rules") or {}

    if value is None:
        return None

    if qtype in {"single_choice", "dropdown"}:
        if not isinstance(value, str) or not value.strip():
            raise BadRequestError("Choice answer must be a non-empty string")
        opts = question.get("options") or []
        allowed = {
            str(o.get("value") if isinstance(o, dict) else o) for o in opts
        }
        if allowed and value not in allowed:
            raise BadRequestError("Answer is not a valid option")
        return value

    if qtype == "multiple_choice":
        if not isinstance(value, list):
            raise BadRequestError("Multiple-choice answer must be an array")
        opts = question.get("options") or []
        allowed = {
            str(o.get("value") if isinstance(o, dict) else o) for o in opts
        }
        cleaned = [str(v) for v in value]
        if allowed and any(v not in allowed for v in cleaned):
            raise BadRequestError("Answer includes an invalid option")
        return cleaned

    if qtype in {"rating_scale", "number"}:
        try:
            num = float(value)
        except (TypeError, ValueError) as exc:
            raise BadRequestError("Answer must be a number") from exc
        if "min" in rules and rules["min"] is not None and num < float(rules["min"]):
            raise BadRequestError("Answer is below the minimum")
        if "max" in rules and rules["max"] is not None and num > float(rules["max"]):
            raise BadRequestError("Answer is above the maximum")
        # Prefer int when whole number (rating scales)
        if num.is_integer():
            return int(num)
        return num

    if qtype in {"short_text", "long_text", "date"}:
        if not isinstance(value, str):
            raise BadRequestError("Answer must be a string")
        text = value
        if "min_length" in rules and rules["min_length"] is not None:
            if len(text) < int(rules["min_length"]):
                raise BadRequestError("Answer is too short")
        if "max_length" in rules and rules["max_length"] is not None:
            if len(text) > int(rules["max_length"]):
                raise BadRequestError("Answer is too long")
        return text

    return value


class CollectionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.surveys = SurveyRepository(session)
        self.versions = SurveyVersionRepository(session)
        self.respondents = RespondentRepository(session)
        self.answers = ResponseAnswerRepository(session)

    async def publish(self, *, user: User, survey_id: UUID) -> PublishResponse:
        org_id = _require_org(user)
        survey = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=org_id
        )
        if survey is None:
            raise NotFoundError("Survey not found")
        if survey.status == SurveyStatus.archived.value:
            raise BadRequestError("Archived surveys cannot be published")
        if survey.status == SurveyStatus.closed.value:
            raise BadRequestError("Closed surveys cannot be re-published")

        question_count = sum(
            len(s.questions or []) for s in (survey.sections or [])
        )
        if question_count == 0:
            raise BadRequestError(
                "Add at least one question before publishing."
            )

        snapshot = _snapshot_from_survey(survey)
        version_number = await self.versions.next_version_number(
            survey_id=survey.id
        )
        version = SurveyVersion(
            survey_id=survey.id,
            version_number=version_number,
            structure_snapshot=snapshot,
            published_by=user.id,
        )
        self.session.add(version)
        await self.session.flush()

        survey.status = SurveyStatus.published.value
        survey.current_version_id = version.id
        await self.session.commit()
        await self.session.refresh(version)

        return PublishResponse(
            survey_id=survey.id,
            version_id=version.id,
            version_number=version.version_number,
            status=survey.status,
            published_at=version.published_at,
            collection_path=f"/s/{version.id}",
        )

    async def close(self, *, user: User, survey_id: UUID) -> CollectStatsPublic:
        org_id = _require_org(user)
        survey = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=org_id
        )
        if survey is None:
            raise NotFoundError("Survey not found")
        if survey.status != SurveyStatus.published.value:
            raise BadRequestError("Only published surveys can be closed")
        survey.status = SurveyStatus.closed.value
        await self.session.commit()
        return await self.get_stats(user=user, survey_id=survey_id)

    async def get_stats(
        self, *, user: User, survey_id: UUID
    ) -> CollectStatsPublic:
        org_id = _require_org(user)
        survey = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=org_id
        )
        if survey is None:
            raise NotFoundError("Survey not found")
        count = await self.respondents.count_completed_for_survey(
            survey_id=survey.id
        )
        path = (
            f"/s/{survey.current_version_id}"
            if survey.current_version_id
            else None
        )
        return CollectStatsPublic(
            survey_id=survey.id,
            response_count=count,
            current_version_id=survey.current_version_id,
            status=survey.status,
            collection_path=path,
        )

    async def get_public_survey(self, *, version_id: UUID) -> PublicSurveyOut:
        version = await self.versions.get_by_id(version_id)
        if version is None:
            raise NotFoundError("Survey not found")
        survey = await self.surveys.get_by_id(version.survey_id)
        if survey is None:
            raise NotFoundError("Survey not found")
        if survey.status not in {
            SurveyStatus.published.value,
            SurveyStatus.closed.value,
        }:
            raise NotFoundError("Survey not found")
        # Closed: still show the instrument but start_respondent will reject.
        return _public_from_version(
            version, anonymous_collection=survey.anonymous_collection
        )

    async def start_respondent(
        self,
        *,
        version_id: UUID,
        ip: str | None,
        user_agent: str | None,
    ) -> RespondentPublic:
        version = await self.versions.get_by_id(version_id)
        if version is None:
            raise NotFoundError("Survey not found")
        survey = await self.surveys.get_by_id(version.survey_id)
        if survey is None:
            raise NotFoundError("Survey not found")
        if survey.status != SurveyStatus.published.value:
            raise BadRequestError("This survey is not accepting responses")
        # Prefer the current published version for collection links that lag.
        if (
            survey.current_version_id is not None
            and survey.current_version_id != version.id
        ):
            # Still allow answering an older published version if explicitly linked.
            pass

        respondent = Respondent(
            survey_id=survey.id,
            survey_version_id=version.id,
            is_anonymous=survey.anonymous_collection,
            ip_hash=_hash_ip(ip),
            user_agent=(user_agent or "")[:500] or None,
        )
        self.session.add(respondent)
        await self.session.commit()
        await self.session.refresh(respondent)
        return RespondentPublic.model_validate(respondent)

    async def upsert_answer(
        self,
        *,
        respondent_id: UUID,
        session_token: UUID,
        question_id: UUID,
        value: Any,
    ) -> dict[str, str]:
        respondent = await self._require_open_respondent(
            respondent_id, session_token
        )
        version = await self.versions.get_by_id(respondent.survey_version_id)
        if version is None:
            raise NotFoundError("Survey version not found")
        q_by_id = _question_index_from_snapshot(version.structure_snapshot or {})
        qkey = str(question_id)
        if qkey not in q_by_id:
            raise BadRequestError("Question is not part of this survey version")
        cleaned = _validate_answer_value(q_by_id[qkey], value)

        existing = await self.answers.get_for_respondent_question(
            respondent_id=respondent.id, question_id=question_id
        )
        now = datetime.now(timezone.utc)
        if existing is None:
            self.session.add(
                ResponseAnswer(
                    respondent_id=respondent.id,
                    question_id=question_id,
                    survey_version_id=version.id,
                    answer_value=cleaned,
                    answered_at=now,
                )
            )
        else:
            existing.answer_value = cleaned
            existing.answered_at = now
        await self.session.commit()
        return {"status": "ok"}

    async def complete(
        self, *, respondent_id: UUID, body: CompleteBody
    ) -> RespondentPublic:
        respondent = await self._require_open_respondent(
            respondent_id, body.session_token
        )
        version = await self.versions.get_by_id(respondent.survey_version_id)
        if version is None:
            raise NotFoundError("Survey version not found")

        q_by_id = _question_index_from_snapshot(version.structure_snapshot or {})
        saved = await self.answers.list_for_respondent(
            respondent_id=respondent.id
        )
        answered = {
            str(a.question_id): a.answer_value
            for a in saved
            if a.answer_value is not None
            and not (
                isinstance(a.answer_value, str) and not a.answer_value.strip()
            )
            and not (isinstance(a.answer_value, list) and len(a.answer_value) == 0)
        }

        missing: list[str] = []
        for qid, q in q_by_id.items():
            if not q.get("is_required"):
                continue
            # Skip required questions gated by inactive conditional logic — client
            # already filtered; server treats unknown logic as required.
            if qid not in answered:
                missing.append(qid)
        if missing:
            raise BadRequestError(
                f"Missing required answers ({len(missing)} question(s))"
            )

        respondent.completed_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(respondent)
        return RespondentPublic.model_validate(respondent)

    async def _require_open_respondent(
        self, respondent_id: UUID, session_token: UUID
    ) -> Respondent:
        respondent = await self.respondents.get_by_id(respondent_id)
        if respondent is None:
            raise NotFoundError("Respondent not found")
        if respondent.session_token != session_token:
            raise ForbiddenError("Invalid session token")
        if respondent.completed_at is not None:
            raise BadRequestError("This response is already completed")

        survey = await self.surveys.get_by_id(respondent.survey_id)
        if survey is None or survey.status != SurveyStatus.published.value:
            raise BadRequestError("This survey is not accepting responses")
        return respondent
