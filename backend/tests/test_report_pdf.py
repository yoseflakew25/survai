"""PDF export renders deterministic bytes from stored sections."""

from __future__ import annotations

from app.services.report_pdf import build_report_pdf


def test_build_report_pdf_contains_pdf_header() -> None:
    pdf = build_report_pdf(
        title="Community Health Report",
        survey_title="Community Health Assessment",
        sections=[
            {
                "id": "executive_summary",
                "title": "Executive Summary",
                "content": (
                    "This survey collected 42 responses with an 80% completion rate.\n\n"
                    "Key themes include access and awareness."
                ),
            },
            {
                "id": "recommendations",
                "title": "Recommendations",
                "content": "Expand outreach in underserved communities.",
            },
        ],
        generated_label="25 Oct 2026",
    )
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 500


def test_build_report_pdf_handles_empty_section() -> None:
    pdf = build_report_pdf(
        title="Empty",
        survey_title="Survey",
        sections=[{"id": "x", "title": "Notes", "content": ""}],
    )
    assert pdf.startswith(b"%PDF")
