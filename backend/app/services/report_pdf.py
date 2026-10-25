"""Deterministic report → PDF renderer (no LLM)."""

from __future__ import annotations

import re
from typing import Any

from fpdf import FPDF

_MD_BOLD = re.compile(r"\*\*(.+?)\*\*")


def _plain(text: str) -> str:
    """Strip light markdown; keep readable prose for PDF."""
    cleaned = _MD_BOLD.sub(r"\1", text or "")
    return cleaned.replace("\r\n", "\n").strip()


class ReportPDF(FPDF):
    def footer(self) -> None:  # noqa: D401 — FPDF hook
        self.set_y(-12)
        self.set_font("Helvetica", size=8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Page {self.page_no()}/{{nb}}", align="C")


def build_report_pdf(
    *,
    title: str,
    survey_title: str,
    sections: list[dict[str, Any]],
    generated_label: str | None = None,
) -> bytes:
    """Render report sections to PDF bytes (Helvetica — ASCII-safe with latin-1 fallback)."""
    pdf = ReportPDF(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_margins(18, 18, 18)

    pdf.set_font("Helvetica", "B", 18)
    pdf.multi_cell(0, 9, _pdf_safe(title or "Survey Report"))
    pdf.ln(2)

    pdf.set_font("Helvetica", size=10)
    pdf.set_text_color(90, 90, 90)
    meta = f"Survey: {_pdf_safe(survey_title)}"
    if generated_label:
        meta += f"  ·  {generated_label}"
    pdf.multi_cell(0, 5, meta)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(18, pdf.get_y(), 192, pdf.get_y())
    pdf.ln(6)

    for index, sec in enumerate(sections or [], start=1):
        heading = _pdf_safe(str(sec.get("title") or f"Section {index}"))
        body = _plain(str(sec.get("content") or ""))

        pdf.set_font("Helvetica", "B", 13)
        pdf.multi_cell(0, 7, f"{index}. {heading}")
        pdf.ln(1)

        pdf.set_font("Helvetica", size=10)
        paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [body] if body else ["(Empty section)"]
        for para in paragraphs:
            # Preserve single newlines inside a paragraph as soft breaks
            for line in para.split("\n"):
                chunk = _pdf_safe(line.strip())
                if not chunk:
                    pdf.ln(2)
                    continue
                pdf.multi_cell(0, 5.5, chunk)
            pdf.ln(3)
        pdf.ln(2)

    out = pdf.output()
    if isinstance(out, bytes | bytearray):
        return bytes(out)
    return str(out).encode("latin-1")


def _pdf_safe(text: str) -> str:
    """Helvetica core fonts are latin-1; replace unsupported glyphs."""
    return (
        (text or "")
        .replace("—", "-")
        .replace("–", "-")
        .replace("“", '"')
        .replace("”", '"')
        .replace("‘", "'")
        .replace("’", "'")
        .replace("…", "...")
        .encode("latin-1", errors="replace")
        .decode("latin-1")
    )
