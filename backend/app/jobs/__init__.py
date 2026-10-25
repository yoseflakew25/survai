"""ARQ background jobs (§14).

Redis + ARQ is the target queue. Until Redis is provisioned, `enqueue` runs
callables inline so report/export paths stay usable synchronously.
"""

from app.jobs.queue import enqueue, get_redis_settings

__all__ = ["enqueue", "get_redis_settings"]
