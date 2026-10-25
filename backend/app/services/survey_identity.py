"""Required respondent identity fields on every survey.

Every survey must include a first section with required:
  First Name, Last Name, Email.

Marked via validation_rules.survai_key so regenerate/delete can protect them.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestError
from app.models.survey import Question, QuestionSource, QuestionType, Section, Survey

IDENTITY_SECTION_TITLE = "Respondent details"
IDENTITY_SECTION_DESCRIPTION = (
    "Required contact details for every respondent."
)

# (survai_key, prompt_text, help_text, validation_rules extras)
REQUIRED_IDENTITY_FIELDS: tuple[tuple[str, str, str, dict[str, Any]], ...] = (
    (
        "first_name",
        "First Name",
        "Your given name",
        {"min_length": 1, "max_length": 100},
    ),
    (
        "last_name",
        "Last Name",
        "Your family name",
        {"min_length": 1, "max_length": 100},
    ),
    (
        "email",
        "Email",
        "A valid email address we can use to contact you",
        {"format": "email", "max_length": 254},
    ),
)

IDENTITY_KEYS = frozenset(k for k, *_ in REQUIRED_IDENTITY_FIELDS)


def identity_key(question: Question) -> str | None:
    rules = question.validation_rules or {}
    if not isinstance(rules, dict):
        return None
    key = rules.get("survai_key")
    return str(key) if key else None


def is_identity_question(question: Question) -> bool:
    return identity_key(question) in IDENTITY_KEYS


def is_identity_section(section: Section) -> bool:
    for q in section.questions or []:
        if is_identity_question(q):
            return True
    return False


def assert_can_delete_question(question: Question) -> None:
    if is_identity_question(question):
        raise BadRequestError(
            "First Name, Last Name, and Email are required on every survey "
            "and cannot be deleted."
        )


def assert_can_delete_section(section: Section) -> None:
    if is_identity_section(section):
        raise BadRequestError(
            "The Respondent details section is required and cannot be deleted."
        )


def assert_identity_required_flags(question: Question, *, is_required: bool) -> None:
    if is_identity_question(question) and not is_required:
        raise BadRequestError(
            "First Name, Last Name, and Email must remain required."
        )


def survey_has_required_identity(survey: Survey) -> bool:
    found: set[str] = set()
    for section in survey.sections or []:
        for q in section.questions or []:
            key = identity_key(q)
            if key in IDENTITY_KEYS and q.is_required:
                found.add(key)
    return IDENTITY_KEYS <= found


def assert_publishable_identity(survey: Survey) -> None:
    if not survey_has_required_identity(survey):
        raise BadRequestError(
            "Surveys must include required First Name, Last Name, and Email "
            "questions before publishing."
        )


async def ensure_required_identity_fields(
    session: AsyncSession, *, survey_id: UUID
) -> None:
    """Idempotently ensure the Respondent details section + 3 required fields.

    Always placed as the first section (order_index 0). Other sections are
    shifted up when a new identity section is inserted.
    """
    result = await session.execute(
        select(Survey)
        .where(Survey.id == survey_id)
        .options(selectinload(Survey.sections).selectinload(Section.questions))
        .execution_options(populate_existing=True)
    )
    survey = result.scalar_one_or_none()
    if survey is None:
        return

    sections = sorted(survey.sections or [], key=lambda s: s.order_index)
    identity_section: Section | None = None
    for section in sections:
        if is_identity_section(section) or section.title.strip().lower() in {
            IDENTITY_SECTION_TITLE.lower(),
            "respondent details",
            "contact details",
        }:
            identity_section = section
            break

    created_new_section = False
    if identity_section is None:
        # Shift existing sections so identity can sit at index 0.
        for section in sections:
            section.order_index = section.order_index + 1
        identity_section = Section(
            survey_id=survey_id,
            title=IDENTITY_SECTION_TITLE,
            description=IDENTITY_SECTION_DESCRIPTION,
            order_index=0,
        )
        session.add(identity_section)
        await session.flush()
        created_new_section = True
    else:
        identity_section.title = IDENTITY_SECTION_TITLE
        identity_section.description = IDENTITY_SECTION_DESCRIPTION
        if identity_section.order_index != 0:
            # Move identity to front; bump others that were before it.
            old_idx = identity_section.order_index
            for section in sections:
                if section.id == identity_section.id:
                    continue
                if section.order_index < old_idx:
                    section.order_index = section.order_index + 1
            identity_section.order_index = 0

    existing_by_key: dict[str, Question] = {}
    # Avoid lazy-load on a freshly inserted section (async MissingGreenlet).
    if not created_new_section:
        for q in list(identity_section.questions or []):
            key = identity_key(q)
            if key:
                existing_by_key[key] = q

    for order_index, (key, prompt, help_text, extra_rules) in enumerate(
        REQUIRED_IDENTITY_FIELDS
    ):
        rules = {"survai_key": key, **extra_rules}
        existing = existing_by_key.get(key)
        if existing is not None:
            existing.prompt_text = prompt
            existing.help_text = help_text
            existing.is_required = True
            existing.type = QuestionType.short_text.value
            existing.order_index = order_index
            existing.options = None
            existing.validation_rules = rules
            existing.conditional_logic = None
            continue

        session.add(
            Question(
                survey_id=survey_id,
                section_id=identity_section.id,
                type=QuestionType.short_text.value,
                prompt_text=prompt,
                help_text=help_text,
                is_required=True,
                order_index=order_index,
                options=None,
                validation_rules=rules,
                conditional_logic=None,
                source=QuestionSource.manual.value,
                ai_generation_meta={"system": "required_identity", "key": key},
            )
        )

    await session.flush()
