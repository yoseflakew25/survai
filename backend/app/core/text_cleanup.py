"""Light cleanup for model chat text (esp. Amharic loop / echo failures)."""

from __future__ import annotations

import re

_SENTENCE_SPLIT = re.compile(r"(?<=[።.!?\n])\s+")
_WS = re.compile(r"\s+")


def _norm(s: str) -> str:
    return _WS.sub(" ", s).strip().casefold()


def collapse_repetitive_text(text: str, *, max_chars: int = 700) -> str:
    """Drop repeated paragraphs/sentences and hard-cap length.

    Some models loop on Ethiopic script — same paragraph pasted many times.
    """
    raw = (text or "").strip()
    if not raw:
        return ""

    paragraphs = [p.strip() for p in re.split(r"\n{2,}", raw) if p.strip()]
    if len(paragraphs) >= 2:
        seen: set[str] = set()
        kept: list[str] = []
        for para in paragraphs:
            key = _norm(para)
            if not key or key in seen:
                continue
            seen.add(key)
            kept.append(para)
        raw = "\n\n".join(kept) if kept else paragraphs[0]

    sentences = [s.strip() for s in _SENTENCE_SPLIT.split(raw) if s.strip()]
    if len(sentences) >= 2:
        seen_s: set[str] = set()
        kept_s: list[str] = []
        for sentence in sentences:
            key = _norm(sentence)
            if not key or key in seen_s:
                continue
            # Skip near-duplicates of the previous sentence (prefix overlap).
            if kept_s and (
                key.startswith(_norm(kept_s[-1])[:40])
                or _norm(kept_s[-1]).startswith(key[:40])
            ):
                if len(key) <= len(_norm(kept_s[-1])):
                    continue
                kept_s[-1] = sentence
                seen_s.add(key)
                continue
            seen_s.add(key)
            kept_s.append(sentence)
        raw = " ".join(kept_s) if kept_s else sentences[0]

    # Collapse exact consecutive phrase loops: (foo foo foo)
    for size in (80, 50, 30):
        if len(raw) < size * 3:
            continue
        chunk = raw[:size]
        if raw.count(chunk) >= 3:
            raw = chunk + raw[size:].replace(chunk, "")
            break

    raw = _WS.sub(" ", raw).strip()
    if len(raw) <= max_chars:
        return raw

    cut = raw[:max_chars]
    # Prefer cutting after Amharic/full stop.
    for sep in ("።", ".", "!", "?", "\n"):
        idx = cut.rfind(sep)
        if idx >= max_chars // 2:
            return cut[: idx + 1].strip()
    return cut.rstrip() + "…"
