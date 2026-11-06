"""Local Hugging Face embeddings for org RAG (no Gemini quota).

Uses FastEmbed (ONNX) with a small HF sentence model — free local inference,
no API rate limits beyond machine CPU.
"""

from __future__ import annotations

import asyncio
import logging
import threading
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_model_lock = threading.Lock()
_model: Any | None = None


def _resolve_model_name() -> str:
    name = (settings.embedding_model or "").strip()
    if not name:
        name = "BAAI/bge-small-en-v1.5"
    # Ignore legacy Gemini embedding ids if left in env.
    if name.startswith("text-embedding") or name.startswith("gemini-embedding"):
        logger.warning(
            "Embedding model %r looks like a Gemini id; using BAAI/bge-small-en-v1.5",
            name,
        )
        return "BAAI/bge-small-en-v1.5"
    return name


def _get_model() -> Any:
    """Lazy-load FastEmbed model once per process."""
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        try:
            from fastembed import TextEmbedding
        except ImportError as exc:
            raise RuntimeError(
                "Hugging Face embeddings require fastembed. "
                "Install with: uv pip install 'fastembed>=0.5.0' "
                "--python .venv/bin/python"
            ) from exc

        model_name = _resolve_model_name()
        logger.info("Loading HF embedding model %s (first run may download)", model_name)
        _model = TextEmbedding(model_name=model_name)
        return _model


def _embed_sync(
    texts: list[str], *, task_type: str
) -> list[list[float]]:
    model = _get_model()
    if task_type == "RETRIEVAL_QUERY":
        # Asymmetric query encoder when the model supports it (e.g. BGE).
        vectors = model.query_embed(texts)
    else:
        vectors = model.embed(texts)
    return [[float(x) for x in vec] for vec in vectors]


async def embed_texts(
    texts: list[str],
    *,
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> list[list[float]]:
    """Embed strings for org RAG retrieval / indexing.

    Returns one embedding vector per input text (same order).
    Use ``RETRIEVAL_QUERY`` for user questions and ``RETRIEVAL_DOCUMENT``
    when indexing chunks.
    """
    cleaned = [t.strip() for t in texts if t and t.strip()]
    if not cleaned:
        return []
    return await asyncio.to_thread(
        _embed_sync, cleaned, task_type=task_type
    )
