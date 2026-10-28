"""DOCX export renders a valid OOXML zip from stored sections."""

from __future__ import annotations

import zipfile
from io import BytesIO

from app.services.report_docx import build_report_docx


def test_build_report_docx_is_zip_with_document() -> None:
    raw = build_report_docx(
        title="Community Health Report",
        survey_title="Community Health Assessment",
        sections=[
            {
                "id": "executive_summary",
                "title": "Executive Summary",
                "content": (
                    "This survey collected **42** responses.\n\n"
                    "- Access improved\n"
                    "- Awareness grew"
                ),
            },
            {
                "id": "recommendations",
                "title": "Recommendations",
                "content": "1. Expand outreach\n2. Fund clinics",
            },
        ],
        generated_label="26 Oct 2026",
    )
    assert raw[:2] == b"PK"
    assert len(raw) > 400
    with zipfile.ZipFile(BytesIO(raw)) as zf:
        names = set(zf.namelist())
        assert "[Content_Types].xml" in names
        assert "word/document.xml" in names
        xml = zf.read("word/document.xml").decode("utf-8")
    assert "Community Health Report" in xml
    assert "Executive Summary" in xml
    assert "42" in xml


def test_build_report_docx_handles_empty_section() -> None:
    raw = build_report_docx(
        title="Empty",
        survey_title="Survey",
        sections=[{"id": "x", "title": "Notes", "content": ""}],
    )
    assert raw[:2] == b"PK"
    with zipfile.ZipFile(BytesIO(raw)) as zf:
        xml = zf.read("word/document.xml").decode("utf-8")
    assert "Empty section" in xml
