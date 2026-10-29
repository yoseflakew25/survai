"""Authenticated respondent list + answer detail for a survey."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.collection import Respondent
from app.models.user import User
from app.repositories.collection import (
    RespondentRepository,
    ResponseAnswerRepository,
    SurveyVersionRepository,
)
from app.repositories.survey import SurveyRepository
from app.schemas.respondents import (
    ActiveRespondentFilterPublic,
    RespondentAnswerPublic,
    RespondentDetailPublic,
    RespondentListItemPublic,
    RespondentsListPublic,
    RespondentsSummaryPublic,
)


@dataclass(frozen=True)
class _SnapshotQ:
    id: UUID
    type: str
    prompt_text: str
    help_text: str | None
    section_title: str
    order_index: int
    section_order: int
    options: dict[str, str]  # value -> label
    survai_key: str | None
    scale_max: float | None


def _require_org(user: User) -> UUID:
    if user.organization_id is None:
        raise ForbiddenError("Organization account required")
    return user.organization_id


def _index_snapshot(snapshot: dict[str, Any]) -> dict[UUID, _SnapshotQ]:
    out: dict[UUID, _SnapshotQ] = {}
    for s_idx, section in enumerate(snapshot.get("sections") or []):
        section_title = str(section.get("title") or "Section")
        for q in section.get("questions") or []:
            try:
                qid = UUID(str(q["id"]))
            except (KeyError, ValueError, TypeError):
                continue
            opts: dict[str, str] = {}
            for opt in q.get("options") or []:
                if isinstance(opt, dict):
                    value = str(opt.get("value") or opt.get("id") or "")
                    label = str(opt.get("label") or value)
                    if value:
                        opts[value] = label
                else:
                    s = str(opt)
                    opts[s] = s
            rules = q.get("validation_rules") or {}
            key = None
            scale_max = None
            if isinstance(rules, dict):
                raw_key = rules.get("survai_key")
                key = str(raw_key) if raw_key else None
                vmax = rules.get("max")
                if vmax is not None:
                    try:
                        scale_max = float(vmax)
                    except (TypeError, ValueError):
                        scale_max = None
            out[qid] = _SnapshotQ(
                id=qid,
                type=str(q.get("type") or "short_text"),
                prompt_text=str(q.get("prompt_text") or ""),
                help_text=q.get("help_text"),
                section_title=section_title,
                order_index=int(q.get("order_index") or 0),
                section_order=s_idx,
                options=opts,
                survai_key=key,
                scale_max=scale_max,
            )
    return out


def _display_value(meta: _SnapshotQ | None, raw: Any) -> Any:
    if raw is None:
        return None
    if meta is None:
        return raw
    if isinstance(raw, list):
        return [meta.options.get(str(v), str(v)) for v in raw]
    if meta.type in {"single_choice", "dropdown"}:
        return meta.options.get(str(raw), str(raw))
    if meta.type == "rating_scale":
        try:
            return int(raw) if float(raw) == int(float(raw)) else float(raw)
        except (TypeError, ValueError):
            return raw
    return raw


def _is_answered(raw: Any) -> bool:
    if raw is None:
        return False
    if isinstance(raw, str) and raw.strip() == "":
        return False
    if isinstance(raw, list) and len(raw) == 0:
        return False
    return True


def _duration_seconds(
    resp: Respondent, *, last_answered_at: datetime | None = None
) -> int:
    """Completed: finish − start. Partial: last answer − start (0 if none)."""
    start = resp.started_at
    if start.tzinfo is None:
        start = start.replace(tzinfo=UTC)

    if resp.completed_at is not None:
        end = resp.completed_at
    elif last_answered_at is not None:
        end = last_answered_at
    else:
        return 0

    if end.tzinfo is None:
        end = end.replace(tzinfo=UTC)
    return max(int((end - start).total_seconds()), 0)


def _identity_from_answers(
    answers: dict[UUID, Any], qmeta: dict[UUID, _SnapshotQ]
) -> tuple[str, str]:
    by_key: dict[str, str] = {}
    for qid, raw in answers.items():
        meta = qmeta.get(qid)
        if meta is None or not meta.survai_key or not _is_answered(raw):
            continue
        by_key[meta.survai_key] = str(raw).strip()

    first = by_key.get("first_name", "")
    last = by_key.get("last_name", "")
    email = by_key.get("email", "")
    name = " ".join(p for p in (first, last) if p).strip() or "Anonymous"
    return name, email or "—"


def _answer_matches_filter(
    raw: Any, *, wanted: str, meta: _SnapshotQ | None
) -> bool:
    wanted_l = wanted.strip().lower()
    if not wanted_l:
        return False
    display = _display_value(meta, raw)
    if isinstance(display, list):
        return any(str(v).strip().lower() == wanted_l for v in display)
    if display is None:
        return False
    if str(display).strip().lower() == wanted_l:
        return True
    if str(raw).strip().lower() == wanted_l:
        return True
    return False


class RespondentsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.surveys = SurveyRepository(session)
        self.versions = SurveyVersionRepository(session)
        self.respondents = RespondentRepository(session)
        self.answers = ResponseAnswerRepository(session)

    async def list_respondents(
        self,
        *,
        user: User,
        survey_id: UUID,
        page: int = 1,
        limit: int = 10,
        search: str | None = None,
        status: str | None = None,
        sort: str | None = None,
        question_id: UUID | None = None,
        answer: str | None = None,
    ) -> RespondentsListPublic:
        org_id = _require_org(user)
        survey = await self.surveys.get_for_org_meta(
            survey_id=survey_id, organization_id=org_id
        )
        if survey is None:
            raise NotFoundError("Survey not found")

        # Only completed submissions on the live form (current version) —
        # same instrument as Collect stats and Analytics.
        live_version_id = survey.current_version_id
        if live_version_id is not None:
            respondents = [
                r
                for r in await self.respondents.list_for_version(
                    survey_version_id=live_version_id
                )
                if r.completed_at is not None
            ]
        else:
            respondents = [
                r
                for r in await self.respondents.list_for_survey(
                    survey_id=survey.id
                )
                if r.completed_at is not None
            ]
        all_answers = await self.answers.list_for_survey(survey_id=survey.id)
        versions = await self.versions.list_for_survey(survey_id=survey.id)
        qmeta_by_version: dict[UUID, dict[UUID, _SnapshotQ]] = {
            v.id: _index_snapshot(v.structure_snapshot or {}) for v in versions
        }
        # Flat meta for filter question text lookup
        qmeta_flat: dict[UUID, _SnapshotQ] = {}
        for m in qmeta_by_version.values():
            qmeta_flat.update(m)

        answers_by_resp: dict[UUID, dict[UUID, Any]] = {}
        last_answered: dict[UUID, datetime] = {}
        for ans in all_answers:
            answers_by_resp.setdefault(ans.respondent_id, {})[
                ans.question_id
            ] = ans.answer_value
            prev = last_answered.get(ans.respondent_id)
            if prev is None or ans.answered_at > prev:
                last_answered[ans.respondent_id] = ans.answered_at

        items: list[RespondentListItemPublic] = []
        for resp in respondents:
            qmeta = qmeta_by_version.get(resp.survey_version_id, {})
            row_answers = answers_by_resp.get(resp.id, {})
            name, email = _identity_from_answers(row_answers, qmeta)
            status_val = "completed" if resp.completed_at else "partial"
            submitted = resp.completed_at or resp.started_at
            items.append(
                RespondentListItemPublic(
                    id=resp.id,
                    name=name,
                    email=email,
                    status=status_val,  # type: ignore[arg-type]
                    submitted_at=submitted,
                    duration_seconds=_duration_seconds(
                        resp, last_answered_at=last_answered.get(resp.id)
                    ),
                    survey_version_id=resp.survey_version_id,
                )
            )

        summary = self._summarize(items)
        active_filter: ActiveRespondentFilterPublic | None = None

        filtered = items
        if status in {"completed", "partial"}:
            filtered = [r for r in filtered if r.status == status]

        if search:
            q = search.strip().lower()
            filtered = [
                r
                for r in filtered
                if q in r.name.lower() or q in r.email.lower()
            ]

        if question_id is not None and answer:
            meta = qmeta_flat.get(question_id)
            matching_ids: set[UUID] = set()
            for resp in respondents:
                raw = answers_by_resp.get(resp.id, {}).get(question_id)
                vmeta = qmeta_by_version.get(resp.survey_version_id, {}).get(
                    question_id
                )
                if _answer_matches_filter(raw, wanted=answer, meta=vmeta):
                    matching_ids.add(resp.id)
            before = len(filtered)
            filtered = [r for r in filtered if r.id in matching_ids]
            active_filter = ActiveRespondentFilterPublic(
                question_id=question_id,
                question_text=(meta.prompt_text if meta else "Question"),
                answer=answer,
                count=min(before, len(filtered)),
            )

        filtered = self._sort_items(filtered, sort)

        page = max(page, 1)
        limit = min(max(limit, 1), 100)
        total = len(filtered)
        start = (page - 1) * limit
        page_items = filtered[start : start + limit]

        return RespondentsListPublic(
            survey_id=survey.id,
            total=total,
            respondents=page_items,
            summary=summary,
            active_filter=active_filter,
        )

    async def get_respondent_detail(
        self, *, user: User, survey_id: UUID, respondent_id: UUID
    ) -> RespondentDetailPublic:
        org_id = _require_org(user)
        survey = await self.surveys.get_for_org_meta(
            survey_id=survey_id, organization_id=org_id
        )
        if survey is None:
            raise NotFoundError("Survey not found")

        respondent = await self.respondents.get_for_survey(
            survey_id=survey.id, respondent_id=respondent_id
        )
        if respondent is None:
            raise NotFoundError("Respondent not found")
        # Same live instrument as the list — hide historical versions.
        if (
            survey.current_version_id is not None
            and respondent.survey_version_id != survey.current_version_id
        ):
            raise NotFoundError("Respondent not found")

        version = await self.versions.get_by_id(respondent.survey_version_id)
        if version is None:
            raise NotFoundError("Survey version not found")

        qmeta = _index_snapshot(version.structure_snapshot or {})
        saved = await self.answers.list_for_respondent(
            respondent_id=respondent.id
        )
        by_qid = {a.question_id: a.answer_value for a in saved}

        name, email = _identity_from_answers(by_qid, qmeta)
        status_val = "completed" if respondent.completed_at else "partial"
        submitted = respondent.completed_at or respondent.started_at
        last_ans = max((a.answered_at for a in saved), default=None)

        ordered = sorted(
            qmeta.values(),
            key=lambda q: (q.section_order, q.order_index),
        )
        answers_out: list[RespondentAnswerPublic] = []
        for meta in ordered:
            raw = by_qid.get(meta.id)
            answered = _is_answered(raw)
            answers_out.append(
                RespondentAnswerPublic(
                    question_id=meta.id,
                    section_title=meta.section_title,
                    prompt_text=meta.prompt_text,
                    help_text=meta.help_text,
                    question_type=meta.type,
                    answered=answered,
                    value=_display_value(meta, raw) if answered else None,
                    scale_max=meta.scale_max
                    if meta.type == "rating_scale"
                    else None,
                )
            )

        return RespondentDetailPublic(
            id=respondent.id,
            name=name,
            email=email,
            status=status_val,  # type: ignore[arg-type]
            submitted_at=submitted,
            duration_seconds=_duration_seconds(
                respondent, last_answered_at=last_ans
            ),
            survey_id=survey.id,
            survey_version_id=respondent.survey_version_id,
            survey_title=survey.title,
            survey_status=survey.status,
            anonymous_collection=survey.anonymous_collection,
            answers=answers_out,
        )

    @staticmethod
    def _summarize(
        items: list[RespondentListItemPublic],
    ) -> RespondentsSummaryPublic:
        if not items:
            return RespondentsSummaryPublic(
                responses=0, completed=0, partial=0, avg_duration_seconds=0
            )
        completed = sum(1 for r in items if r.status == "completed")
        avg = round(sum(r.duration_seconds for r in items) / len(items))
        return RespondentsSummaryPublic(
            responses=len(items),
            completed=completed,
            partial=len(items) - completed,
            avg_duration_seconds=avg,
        )

    @staticmethod
    def _sort_items(
        items: list[RespondentListItemPublic], sort: str | None
    ) -> list[RespondentListItemPublic]:
        result = list(items)
        if sort:
            try:
                import json

                sort_items = json.loads(sort)
                if isinstance(sort_items, list) and sort_items:
                    primary = sort_items[0]
                    key = str(primary.get("id") or "submittedAt")
                    desc = bool(primary.get("desc", True))

                    def sort_key(r: RespondentListItemPublic) -> Any:
                        if key == "name":
                            return r.name.lower()
                        if key == "durationSeconds":
                            return r.duration_seconds
                        return r.submitted_at.isoformat()

                    result.sort(key=sort_key, reverse=desc)
                    return result
            except (TypeError, ValueError, AttributeError):
                pass
        result.sort(key=lambda r: r.submitted_at, reverse=True)
        return result
