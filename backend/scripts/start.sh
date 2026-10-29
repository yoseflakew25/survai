#!/bin/sh
# Container entrypoint (Render / Docker): migrate, optional ARQ worker, then serve.
set -eu

PORT="${PORT:-8000}"

echo "Running alembic upgrade head…"
alembic upgrade head

# Free-tier friendly: run the ARQ worker in-process alongside the API when
# REDIS_URL is set (e.g. Upstash). No second Render service required.
if [ -n "${REDIS_URL:-}" ]; then
  echo "REDIS_URL set — starting ARQ worker in background…"
  arq app.jobs.worker.WorkerSettings &
else
  echo "REDIS_URL empty — jobs run inline on the API process"
fi

echo "Starting uvicorn on 0.0.0.0:${PORT}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
