FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN chmod +x scripts/start.sh

# Pre-download HF embedding model into the image so first RAG request
# does not hit Hugging Face at runtime (cold start / offline-friendly).
ENV EMBEDDING_CACHE_DIR=/app/.cache/fastembed \
    HF_HOME=/app/.cache/huggingface
RUN mkdir -p "$EMBEDDING_CACHE_DIR" "$HF_HOME" \
    && python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='BAAI/bge-small-en-v1.5', cache_dir='$EMBEDDING_CACHE_DIR')"

# Aiven Runtime / most hosts: EXPOSE is used for port detection.
# Some platforms inject PORT; start.sh defaults to 8000.
EXPOSE 8000

CMD ["./scripts/start.sh"]
