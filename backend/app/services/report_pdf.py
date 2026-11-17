"""Deterministic report → PDF renderer (no LLM)."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from fpdf import FPDF

from app.core.i18n import normalize_locale

_MD_BOLD = re.compile(r"\*\*(.+?)\*\*")

_ETHIOPIC_FONT_CANDIDATES = (
    Path("/usr/share/fonts/truetype/noto/NotoSansEthiopic-Regular.ttf"),
    Path("/usr/share/fonts/truetype/noto/NotoSansEthiopic-Bold.ttf"),
    Path("/usr/share/fonts/opentype/noto/NotoSansEthiopic-Regular.ttf"),
)

_EXPORT_LABELS = {
    "en": {
        "report": "Survey Report",
        "survey": "Survey",
        "section": "Section",
        "empty": "(Empty section)",
        "page": "Page",
    },
    "am": {
        "report": "የዳሰሳ ሪፖርት",
        "survey": "ዳሰሳ",
        "section": "ክፍል",
        "empty": "(ባዶ ክፍል)",
        "page": "ገጽ",
    },
}


def _plain(text: str) -> str:
    """Strip light markdown; keep readable prose for PDF."""
    cleaned = _MD_BOLD.sub(r"\1", text or "")
    return cleaned.replace("\r\n", "\n").strip()


def _labels(content_language: str | None) -> dict[str, str]:
    return _EXPORT_LABELS[normalize_locale(content_language)]


def _find_ethiopic_font() -> Path | None:
    for path in _ETHIOPIC_FONT_CANDIDATES:
        if path.is_file():
            return path
    return None


class ReportPDF(FPDF):
    def __init__(self, *, page_label: str = "Page", **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._page_label = page_label

    def footer(self) -> None:  # noqa: D401 — FPDF hook
        self.set_y(-12)
        # Page numerals need a Latin core font even when body uses Ethiopic.
        self.set_font("Helvetica", size=8)
        self.set_text_color(120, 120, 120)
        label = self._page_label
        try:
            label.encode("latin-1")
        except UnicodeEncodeError:
            label = "Page"
        self.cell(
            0,
            8,
            f"{label} {self.page_no()}/{{nb}}",
            align="C",
        )


def build_report_pdf(
    *,
    title: str,
    survey_title: str,
    sections: list[dict[str, Any]],
    generated_label: str | None = None,
    content_language: str | None = None,
) -> bytes:
    """Render report sections to PDF bytes (Unicode font when Amharic)."""
    labels = _labels(content_language)
    locale = normalize_locale(content_language)
    pdf = ReportPDF(
        orientation="P",
        unit="mm",
        format="A4",
        page_label=labels["page"],
    )
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_margins(18, 18, 18)

    font_name = "Helvetica"
    use_unicode = locale == "am"
    ethiopic = _find_ethiopic_font() if use_unicode else None
    if ethiopic is not None:
        pdf.add_font("NotoEthiopic", "", str(ethiopic))
        bold_path = ethiopic.with_name("NotoSansEthiopic-Bold.ttf")
        if bold_path.is_file():
            pdf.add_font("NotoEthiopic", "B", str(bold_path))
        font_name = "NotoEthiopic"

    def _set_font(style: str = "", size: float = 10) -> None:
        try:
            pdf.set_font(font_name, style=style, size=size)
        except RuntimeError:
            # Bold face missing — fall back to regular.
            pdf.set_font(font_name, style="", size=size)

    def _safe(text: str) -> str:
        if font_name == "NotoEthiopic":
            return text or ""
        return _pdf_safe(text)

    _set_font("B", 18)
    pdf.multi_cell(0, 9, _safe(title or labels["report"]))
    pdf.ln(2)

    _set_font("", 10)
    pdf.set_text_color(90, 90, 90)
    meta = f"{labels['survey']}: {_safe(survey_title)}"
    if generated_label:
        meta += f"  ·  {generated_label}"
    pdf.multi_cell(0, 5, meta)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(18, pdf.get_y(), 192, pdf.get_y())
    pdf.ln(6)

    for index, sec in enumerate(sections or [], start=1):
        heading = _safe(str(sec.get("title") or f"{labels['section']} {index}"))
        body = _plain(str(sec.get("content") or ""))

        _set_font("B", 13)
        pdf.multi_cell(0, 7, f"{index}. {heading}")
        pdf.ln(1)

        _set_font("", 10)
        paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [body] if body else [labels["empty"]]
        for para in paragraphs:
            for line in para.split("\n"):
                chunk = _safe(line.strip())
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
