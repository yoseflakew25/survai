"""Publish + public collection use-cases (COL-01–05)."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
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
        text = value.strip() if rules.get("format") == "email" else value
        if "min_length" in rules and rules["min_length"] is not None:
            if len(text) < int(rules["min_length"]):
                raise BadRequestError("Answer is too short")
        if "max_length" in rules and rules["max_length"] is not None:
            if len(text) > int(rules["max_length"]):
                raise BadRequestError("Answer is too long")
        if rules.get("format") == "email":
            # Practical email check — not a full RFC parser.
            if "@" not in text or "." not in text.split("@")[-1]:
                raise BadRequestError("Enter a valid email address")
            if " " in text or text.count("@") != 1:
                raise BadRequestError("Enter a valid email address")
            return text.lower()
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
        if survey.status == SurveyStatus.published.value:
            # One live instrument per survey. Questions are locked after publish,
            # so a new version would orphan collect/respondents/analytics.
            raise BadRequestError(
                "This survey is already published. Close it when collection "
                "ends — questions cannot change on a live form."
            )

        question_count = sum(
            len(s.questions or []) for s in (survey.sections or [])
        )
        if question_count == 0:
            raise BadRequestError(
                "Add at least one question before publishing."
            )

        from app.services.survey_identity import (
            assert_publishable_identity,
            ensure_required_identity_fields,
        )

        await ensure_required_identity_fields(self.session, survey_id=survey.id)
        # Reload with sections after ensure
        survey = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=org_id
        )
        if survey is None:
            raise NotFoundError("Survey not found")
        assert_publishable_identity(survey)

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
            # Stable share link — always survey id; resolves to current_version.
            collection_path=f"/s/{survey.id}",
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
        # Live form only — one published instrument's completions.
        if survey.current_version_id is not None:
            count = await self.respondents.count_completed_for_version(
                survey_version_id=survey.current_version_id
            )
        else:
            count = 0
        path = f"/s/{survey.id}" if survey.current_version_id else None
        return CollectStatsPublic(
            survey_id=survey.id,
            response_count=count,
            current_version_id=survey.current_version_id,
            status=survey.status,
            collection_path=path,
        )

    async def _resolve_live_version(
        self, *, collection_ref: UUID
    ) -> tuple[SurveyVersion, Survey]:
        """Map share link id → the survey's single live published version.

        Accepts either ``survey.id`` (canonical) or a historical ``version.id``
        bookmark; both resolve to ``survey.current_version_id`` so there is
        only one live form per survey.
        """
        survey = await self.surveys.get_by_id(collection_ref)
        if survey is None:
            version_hit = await self.versions.get_by_id(collection_ref)
            if version_hit is None:
                raise NotFoundError("Survey not found")
            survey = await self.surveys.get_by_id(version_hit.survey_id)
            if survey is None:
                raise NotFoundError("Survey not found")

        if survey.current_version_id is None:
            raise NotFoundError("Survey not found")

        version = await self.versions.get_by_id(survey.current_version_id)
        if version is None:
            raise NotFoundError("Survey not found")
        return version, survey

    async def get_public_survey(self, *, version_id: UUID) -> PublicSurveyOut:
        version, survey = await self._resolve_live_version(
            collection_ref=version_id
        )
        if survey.status not in {
            SurveyStatus.published.value,
            SurveyStatus.closed.value,
        }:
            raise NotFoundError("Survey not found")
        # Closed: still show the instrument but start_respondent will reject.
        return _public_from_version(
            version, anonymous_collection=survey.anonymous_collection
        )

    async def _require_published_version(
        self, version_id: UUID
    ) -> tuple[SurveyVersion, Survey]:
        version, survey = await self._resolve_live_version(
            collection_ref=version_id
        )
        if survey.status != SurveyStatus.published.value:
            raise BadRequestError("This survey is not accepting responses")
        return version, survey

    async def start_respondent(
        self,
        *,
        version_id: UUID,
        ip: str | None,
        user_agent: str | None,
    ) -> dict[str, str]:
        """Validate that collection is open — does not create a DB row.

        Incomplete sessions are never stored. Use submit_public_survey to
        persist a finished response in one shot.
        """
        del ip, user_agent  # reserved for submit_public_survey
        version, _survey = await self._require_published_version(version_id)
        return {
            "status": "open",
            "survey_version_id": str(version.id),
        }

    async def submit_public_survey(
        self,
        *,
        version_id: UUID,
        answers: list[tuple[UUID, Any]],
        ip: str | None,
        user_agent: str | None,
    ) -> RespondentPublic:
        """Persist a respondent only when the full response is valid + complete."""
        version, survey = await self._require_published_version(version_id)
        q_by_id = _question_index_from_snapshot(version.structure_snapshot or {})

        now = datetime.now(UTC)
        cleaned_by_qid: dict[UUID, Any] = {}
        for question_id, value in answers:
            qkey = str(question_id)
            if qkey not in q_by_id:
                raise BadRequestError(
                    "Question is not part of this survey version"
                )
            cleaned_by_qid[question_id] = _validate_answer_value(
                q_by_id[qkey], value
            )

        answered = {
            str(qid): val
            for qid, val in cleaned_by_qid.items()
            if val is not None
            and not (isinstance(val, str) and not val.strip())
            and not (isinstance(val, list) and len(val) == 0)
        }
        missing = [
            qid
            for qid, q in q_by_id.items()
            if q.get("is_required") and qid not in answered
        ]
        if missing:
            raise BadRequestError(
                f"Missing required answers ({len(missing)} question(s))"
            )

        snap = version.structure_snapshot or {}
        is_anonymous = bool(
            snap.get("anonymous_collection", survey.anonymous_collection)
        )
        respondent = Respondent(
            survey_id=survey.id,
            survey_version_id=version.id,
            is_anonymous=is_anonymous,
            ip_hash=_hash_ip(ip),
            user_agent=(user_agent or "")[:500] or None,
            started_at=now,
            completed_at=now,
        )
        self.session.add(respondent)
        await self.session.flush()

        for question_id, cleaned in cleaned_by_qid.items():
            if str(question_id) not in answered:
                continue
            self.session.add(
                ResponseAnswer(
                    respondent_id=respondent.id,
                    question_id=question_id,
                    survey_version_id=version.id,
                    answer_value=cleaned,
                    answered_at=now,
                )
            )

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
        now = datetime.now(UTC)
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

    async def submit_survey(
        self,
        *,
        respondent_id: UUID,
        session_token: UUID,
        answers: list[tuple[UUID, Any]],
    ) -> RespondentPublic:
        """Upsert every answer and complete in a single DB transaction.

        Avoids N round-trips when the public form submits at the end.
        """
        respondent = await self._require_open_respondent(
            respondent_id, session_token
        )
        version = await self.versions.get_by_id(respondent.survey_version_id)
        if version is None:
            raise NotFoundError("Survey version not found")

        q_by_id = _question_index_from_snapshot(version.structure_snapshot or {})
        existing_rows = await self.answers.list_for_respondent(
            respondent_id=respondent.id
        )
        by_qid = {row.question_id: row for row in existing_rows}
        now = datetime.now(UTC)

        for question_id, value in answers:
            qkey = str(question_id)
            if qkey not in q_by_id:
                raise BadRequestError(
                    "Question is not part of this survey version"
                )
            cleaned = _validate_answer_value(q_by_id[qkey], value)
            existing = by_qid.get(question_id)
            if existing is None:
                row = ResponseAnswer(
                    respondent_id=respondent.id,
                    question_id=question_id,
                    survey_version_id=version.id,
                    answer_value=cleaned,
                    answered_at=now,
                )
                self.session.add(row)
                by_qid[question_id] = row
            else:
                existing.answer_value = cleaned
                existing.answered_at = now

        answered = {
            str(qid): row.answer_value
            for qid, row in by_qid.items()
            if row.answer_value is not None
            and not (
                isinstance(row.answer_value, str)
                and not row.answer_value.strip()
            )
            and not (
                isinstance(row.answer_value, list) and len(row.answer_value) == 0
            )
        }
        missing = [
            qid
            for qid, q in q_by_id.items()
            if q.get("is_required") and qid not in answered
        ]
        if missing:
            raise BadRequestError(
                f"Missing required answers ({len(missing)} question(s))"
            )

        respondent.completed_at = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(respondent)
        return RespondentPublic.model_validate(respondent)

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

        respondent.completed_at = datetime.now(UTC)
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
