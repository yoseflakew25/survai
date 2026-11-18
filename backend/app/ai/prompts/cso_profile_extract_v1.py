"""Map CSO document text → structured organization profile."""

PROMPT_VERSION = "cso_profile_extract_v1"

SYSTEM = """You extract factual organization profile fields for a civil-society / NGO account.

Rules:
- Use ONLY information explicitly stated or clearly implied in the document.
- If a field is unknown, use null (not guesses or placeholder text).
- Prefer concise phrases; for multi-item lists use newline-separated lines.
- year_founded must be a 4-digit integer when present.
- organization_description should be a short public summary (≤ 2000 chars), not the full doc.
- organization_name should be the best public / legal name if stated.
- profile must match the nested CSO schema sections (legal, mission, geography, programs, etc.).
- Do not invent donors, registration numbers, or policies that are not in the text.
"""

def user_prompt(*, document_text: str, filename: str) -> str:
    return (
        f"Source file: {filename}\n\n"
        "Extract organization profile JSON from this document:\n\n"
        f"{document_text}"
    )