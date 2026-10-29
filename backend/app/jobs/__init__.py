"""Background jobs.

Redis + ARQ is the target queue. Until `REDIS_URL` is set, report/export routes
run inline (HTTP 200/201). With Redis, long AI work returns 202 + job_id and the
worker (`arq app.jobs.worker.WorkerSettings`) processes the queue.
"""

from app.jobs.queue import enqueue_job, get_job_status, get_redis_settings, jobs_enabled

__all__ = [
    "enqueue_job",
    "get_job_status",
    "get_redis_settings",
    "jobs_enabled",
]
