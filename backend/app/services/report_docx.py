"""Deterministic report → DOCX renderer (stdlib OOXML, no LLM)."""

from __future__ import annotations

import re
import zipfile
from io import BytesIO
from typing import Any
from xml.sax.saxutils import escape

_MD_BOLD = re.compile(r"\*\*(.+?)\*\*")
_BULLET = re.compile(r"^[-•]\s+(.*)$")
_NUMBERED = re.compile(r"^\d+\.\s+(.*)$")

# OOXML boilerplate — long URIs are required by the package format.
_CONTENT_TYPES = (  # noqa: E501
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" '
    'ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" '
    'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    "</Types>"
)

_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" '
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
    'Target="word/document.xml"/>'
    "</Relationships>"
)

_DOC_RELS = """\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
"""

_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _runs_xml(text: str, *, bold: bool = False, size_half_points: int = 22) -> str:
    """One or more <w:r> for text that may include **bold** markers."""
    if bold:
        parts = [text]
        bold_flags = [True]
    else:
        parts = _MD_BOLD.split(text or "")
        bold_flags = [i % 2 == 1 for i in range(len(parts))]

    chunks: list[str] = []
    for part, is_bold in zip(parts, bold_flags, strict=False):
        if not part:
            continue
        b = "<w:b/>" if is_bold else ""
        chunks.append(
            f'<w:r><w:rPr>{b}<w:sz w:val="{size_half_points}"/>'
            f'<w:szCs w:val="{size_half_points}"/></w:rPr>'
            f"<w:t xml:space=\"preserve\">{escape(part)}</w:t></w:r>"
        )
    if not chunks:
        chunks.append(
            f'<w:r><w:rPr><w:sz w:val="{size_half_points}"/></w:rPr>'
            f"<w:t></w:t></w:r>"
        )
    return "".join(chunks)


def _paragraph(
    text: str,
    *,
    style: str | None = None,
    bold: bool = False,
    size_half_points: int = 22,
    space_after: int = 120,
) -> str:
    ppr_bits = [f'<w:spacing w:after="{space_after}"/>']
    if style:
        ppr_bits.insert(0, f'<w:pStyle w:val="{style}"/>')
    ppr = f"<w:pPr>{''.join(ppr_bits)}</w:pPr>"
    return f"<w:p>{ppr}{_runs_xml(text, bold=bold, size_half_points=size_half_points)}</w:p>"


def _heading(text: str, level: int) -> str:
    # Outline levels: Title≈0 style, Heading1/2
    if level <= 0:
        return _paragraph(
            text, style="Title", bold=True, size_half_points=36, space_after=200
        )
    style = "Heading1" if level == 1 else "Heading2"
    size = 28 if level == 1 else 24
    return _paragraph(
        text, style=style, bold=True, size_half_points=size, space_after=160
    )


def _body_paragraphs(content: str) -> list[str]:
    body = (content or "").replace("\r\n", "\n").strip()
    if not body:
        return [_paragraph("(Empty section)")]

    out: list[str] = []
    for block in body.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        lines = [ln.rstrip() for ln in block.split("\n") if ln.strip()]
        if not lines:
            continue
        if all(_BULLET.match(ln) or _NUMBERED.match(ln) for ln in lines):
            for ln in lines:
                m = _BULLET.match(ln) or _NUMBERED.match(ln)
                assert m is not None
                style = "ListNumber" if _NUMBERED.match(ln) else "ListBullet"
                out.append(_paragraph(m.group(1), style=style))
            continue
        for ln in lines:
            out.append(_paragraph(ln))
    return out


def build_report_docx(
    *,
    title: str,
    survey_title: str,
    sections: list[dict[str, Any]],
    generated_label: str | None = None,
) -> bytes:
    """Render report sections to DOCX bytes (Office Open XML package)."""
    parts: list[str] = [_heading(title or "Survey Report", 0)]

    meta = f"Survey: {survey_title}"
    if generated_label:
        meta += f"  ·  {generated_label}"
    parts.append(_paragraph(meta, size_half_points=20, space_after=240))

    for index, sec in enumerate(sections or [], start=1):
        sec_title = str(sec.get("title") or f"Section {index}").strip()
        parts.append(_heading(f"{index}. {sec_title}", 1))
        parts.extend(_body_paragraphs(str(sec.get("content") or "")))

    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document xmlns:w="{_W}">'
        f"<w:body>{''.join(parts)}"
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>'
        "</w:sectPr></w:body></w:document>"
    )

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", _CONTENT_TYPES)
        zf.writestr("_rels/.rels", _RELS)
        zf.writestr("word/document.xml", document_xml)
        zf.writestr("word/_rels/document.xml.rels", _DOC_RELS)
    return buf.getvalue()
