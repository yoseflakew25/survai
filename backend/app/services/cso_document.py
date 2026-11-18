"""Extract organization profile fields from uploaded CSO documents."""

from __future__ import annotations

import re
import zipfile
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import call_structured
from app.ai.prompts import cso_profile_extract_v1
from app.core.exceptions import BadRequestError
from app.core.feature_flags import assert_org_flag
from app.models.user import User
from app.schemas.cso_profile import (
    CsoProfileExtractionOutput,
    parse_cso_profile,
)

_MAX_UPLOAD_BYTES = 5 * 1024 * 1024
_MAX_TEXT_CHARS = 48_000
_ALLOWED_SUFFIXES = frozenset({".pdf", ".docx", ".txt", ".md", ".markdown"})



def _suffix(filename: str) -> str:
    return Path(filename or "upload").suffix.lower()


def extract_document_text(*, filename: str, data: bytes) -> str:
    """Plain text from PDF, DOCX, or UTF-8 text formats."""
    if not data:
        raise BadRequestError("The uploaded file is empty.")
    if len(data) > _MAX_UPLOAD_BYTES:
        raise BadRequestError("File is too large (max 5 MB).")

    suffix = _suffix(filename)
    if suffix not in _ALLOWED_SUFFIXES:
        raise BadRequestError(
            "Unsupported file type. Upload PDF, DOCX, TXT, or Markdown."
        )

    if suffix == ".pdf":
        try:
            reader = PdfReader(BytesIO(data))
        except Exception as exc:
            raise BadRequestError("Could not read PDF.") from exc
        parts: list[str] = []
        for page in reader.pages:
            chunk = page.extract_text() or ""
            if chunk.strip():
                parts.append(chunk.strip())
        text = "\n\n".join(parts)
    elif suffix == ".docx":
        text = _extract_docx_text(data)
    else:
        text = data.decode("utf-8", errors="replace")

    text = _normalize_whitespace(text)
    if len(text) < 40:
        raise BadRequestError(
            "Not enough readable text in this file. Try a text-based PDF or DOCX."
        )
    if len(text) > _MAX_TEXT_CHARS:
        text = text[:_MAX_TEXT_CHARS]
    return text


def _extract_docx_text(data: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(data)) as zf:
            xml = zf.read("word/document.xml").decode("utf-8", errors="replace")
    except (KeyError, zipfile.BadZipFile, OSError) as exc:
        raise BadRequestError("Could not read DOCX.") from exc

    xml = re.sub(r"</w:p>", "\n", xml)
    xml = re.sub(r"<w:tab[^/]*/>", "\t", xml)
    runs = re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml, flags=re.DOTALL)
    if not runs:
        stripped = re.sub(r"<[^>]+>", " ", xml)
        return _normalize_whitespace(stripped)
    return _normalize_whitespace("".join(runs))


def _normalize_whitespace(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


async def extract_cso_profile_from_document(
    *,
    user: User,
    filename: str,
    data: bytes,
    session: AsyncSession,
) -> dict:
    """Return proposed org fields without persisting."""
    if user.organization_id is None:
        raise BadRequestError("No organization linked to this account.")

    await assert_org_flag(
        session, organization_id=user.organization_id, key="ai_assistant"
    )

    text = extract_document_text(filename=filename, data=data)
    result = await call_structured(
        feature="cso_profile_extract",
        system=cso_profile_extract_v1.SYSTEM,
        user=cso_profile_extract_v1.user_prompt(
            document_text=text, filename=filename
        ),
        schema=CsoProfileExtractionOutput,
        user_id=user.id,
        session=session,
        input_meta={
            "filename": filename,
            "text_chars": len(text),
        },
    )
    output = result.value
    assert isinstance(output, CsoProfileExtractionOutput)

    profile = parse_cso_profile(output.profile.model_dump())
    org_name = (output.organization_name or "").strip() or None
    org_desc = (output.organization_description or "").strip() or None
    if org_name and len(org_name) > 100:
        org_name = org_name[:100]
    if org_desc and len(org_desc) > 2000:
        org_desc = org_desc[:2000]

    return {
        "organization_name": org_name,
        "organization_description": org_desc,
        "organization_cso_profile": profile,
        "source_filename": Path(filename or "document").name,
        "characters_extracted": len(text),
    }