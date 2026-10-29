#!/usr/bin/env python3
"""API pilot smoke — login → surveys → collect stats → analytics → report → PDF.

Usage (verified account, no OTP step):
  cd backend && source .venv/bin/activate
  export SMOKE_API_BASE=https://survai-mzam.onrender.com/api/v1
  export SMOKE_EMAIL=you@example.com
  export SMOKE_PASSWORD='…'
  # optional: SMOKE_SURVEY_ID=<uuid>
  python scripts/pilot_smoke.py

Exits 0 on success. Prints a short checklist as it goes.
"""

from __future__ import annotations

import os
import sys
import time
from typing import Any

import httpx

API = os.environ.get("SMOKE_API_BASE", "http://localhost:8000/api/v1").rstrip("/")
EMAIL = os.environ.get("SMOKE_EMAIL", "")
PASSWORD = os.environ.get("SMOKE_PASSWORD", "")
SURVEY_ID = os.environ.get("SMOKE_SURVEY_ID", "")


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"OK   {msg}")


def main() -> None:
    if not EMAIL or not PASSWORD:
        fail("Set SMOKE_EMAIL and SMOKE_PASSWORD")

    with httpx.Client(base_url=API, timeout=120.0, follow_redirects=True) as client:
        health = client.get("/health")
        if health.status_code != 200:
            fail(f"health → {health.status_code}")
        ok("health")

        login = client.post(
            "/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
        )
        if login.status_code != 200:
            fail(f"login → {login.status_code} {login.text[:200]}")
        tokens = login.json()
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        ok(f"login as {tokens['user']['email']}")

        survey_id = SURVEY_ID
        if not survey_id:
            listed = client.get("/surveys", headers=headers)
            if listed.status_code != 200:
                fail(f"list surveys → {listed.status_code}")
            payload = listed.json()
            items = (
                payload.get("items")
                or payload.get("surveys")
                or (payload if isinstance(payload, list) else [])
            )
            if not items:
                fail("No surveys — create one in the UI or set SMOKE_SURVEY_ID")
            first = items[0]
            survey_id = first["id"] if isinstance(first, dict) else str(first)
            ok(f"picked survey {survey_id}")
        else:
            ok(f"using SMOKE_SURVEY_ID={survey_id}")

        stats = client.get(f"/surveys/{survey_id}/collect-stats", headers=headers)
        if stats.status_code != 200:
            fail(f"collect-stats → {stats.status_code} {stats.text[:200]}")
        ok(f"collect-stats responses={stats.json().get('response_count')}")

        summary = client.get(
            f"/surveys/{survey_id}/analytics/summary", headers=headers
        )
        if summary.status_code != 200:
            fail(f"analytics summary → {summary.status_code} {summary.text[:200]}")
        ok("analytics summary")

        latest = client.get(
            f"/surveys/{survey_id}/reports/latest", headers=headers
        )
        if latest.status_code not in (200, 404):
            fail(f"reports/latest → {latest.status_code}")
        report: dict[str, Any] | None = (
            latest.json() if latest.status_code == 200 and latest.content else None
        )
        if report is None or report == {}:
            gen = client.post(
                f"/surveys/{survey_id}/reports",
                headers=headers,
                json={"audience": "internal"},
                timeout=300.0,
            )
            if gen.status_code == 202:
                job_id = gen.json()["job_id"]
                ok(f"report queued job_id={job_id}")
                report = _poll_job(client, headers, job_id)
            elif gen.status_code in (200, 201):
                report = gen.json()
                ok(f"report generated id={report['id']}")
            else:
                fail(f"generate report → {gen.status_code} {gen.text[:300]}")
        else:
            ok(f"existing report id={report['id']}")

        export = client.post(
            f"/reports/{report['id']}/export",
            headers=headers,
            json={"type": "pdf"},
            timeout=120.0,
        )
        if export.status_code != 200:
            fail(f"pdf export → {export.status_code} {export.text[:200]}")
        body = export.json()
        if not body.get("content_base64") and not body.get("file_url"):
            fail("pdf export missing content")
        ok("pdf export")

    print("\nPilot smoke passed.")


def _poll_job(
    client: httpx.Client, headers: dict[str, str], job_id: str
) -> dict[str, Any]:
    deadline = time.time() + 300
    while time.time() < deadline:
        res = client.get(f"/jobs/{job_id}", headers=headers)
        if res.status_code != 200:
            fail(f"job poll → {res.status_code}")
        data = res.json()
        status = data.get("status")
        if status == "complete":
            result = data.get("result") or {}
            ok(f"job complete report_id={result.get('id')}")
            return result
        if status == "failed":
            fail(f"job failed: {data.get('error')}")
        time.sleep(2)
    fail("job poll timed out")


if __name__ == "__main__":
    main()
