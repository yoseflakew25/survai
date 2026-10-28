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

# Aiven Runtime / most hosts: EXPOSE is used for port detection.
# Some platforms inject PORT; start.sh defaults to 8000.
EXPOSE 8000

CMD ["./scripts/start.sh"]
