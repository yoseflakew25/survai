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
        jobs = (health.json() or {}).get("jobs") or {}
        ok(f"health jobs.enabled={jobs.get('enabled')} redis={jobs.get('redis')}")

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
        if export.status_code == 202:
            job_id = export.json()["job_id"]
            ok(f"pdf export queued job_id={job_id}")
            body = _poll_job(client, headers, job_id)
        elif export.status_code in (200, 201):
            body = export.json()
        else:
            fail(f"pdf export → {export.status_code} {export.text[:200]}")
        if not body.get("content_base64") and not body.get("file_url"):
            fail("pdf export missing content")
        ok("pdf export")

        # Donor pack (0018-era feature) — JSON envelope with base64 ZIP
        pack = client.post(
            f"/reports/{report['id']}/export-pack",
            headers=headers,
            timeout=180.0,
        )
        if pack.status_code not in (200, 201):
            fail(f"donor pack → {pack.status_code} {pack.text[:200]}")
        pack_body = pack.json()
        b64 = pack_body.get("content_base64") or ""
        if not b64:
            fail("donor pack missing content_base64")
        if (pack_body.get("mime_type") or "") != "application/zip":
            fail(f"donor pack mime={pack_body.get('mime_type')!r}")
        import base64

        raw = base64.b64decode(b64)
        if raw[:2] != b"PK":
            fail("donor pack base64 is not a ZIP")
        ok(f"donor pack ({len(raw)} bytes, {pack_body.get('filename')})")

        # Collection quota (0018) — write + read back, then clear
        patched = client.patch(
            f"/surveys/{survey_id}",
            headers=headers,
            json={"response_quota": 500},
        )
        if patched.status_code != 200:
            fail(f"set quota → {patched.status_code} {patched.text[:200]}")
        if patched.json().get("response_quota") != 500:
            fail("quota not persisted")
        cleared = client.patch(
            f"/surveys/{survey_id}",
            headers=headers,
            json={"response_quota": None},
        )
        if cleared.status_code != 200:
            fail(f"clear quota → {cleared.status_code} {cleared.text[:200]}")
        ok("quota patch/clear")

        # Org invite create + revoke (0017)
        invite = client.post(
            "/org/invites",
            headers=headers,
            json={
                "email": f"smoke-invite-{int(time.time())}@example.com",
                "role": "viewer",
            },
        )
        if invite.status_code != 201:
            fail(f"create invite → {invite.status_code} {invite.text[:200]}")
        invite_id = (invite.json().get("invite") or invite.json()).get("id")
        if not invite_id:
            fail("invite id missing")
        revoked = client.delete(f"/org/invites/{invite_id}", headers=headers)
        if revoked.status_code not in (200, 204):
            fail(f"revoke invite → {revoked.status_code} {revoked.text[:200]}")
        ok("invite create/revoke")

        # Org Assistant (sync JSON path — streaming is covered in UI)
        thread = client.post(
            "/assistant/threads",
            headers=headers,
            json={"title": "Smoke assistant"},
        )
        if thread.status_code != 201:
            fail(f"assistant thread → {thread.status_code} {thread.text[:200]}")
        thread_id = thread.json()["id"]
        ask = client.post(
            f"/assistant/threads/{thread_id}/messages",
            headers=headers,
            json={"content": "Briefly list our surveys."},
            timeout=180.0,
        )
        if ask.status_code != 200:
            fail(f"assistant message → {ask.status_code} {ask.text[:300]}")
        msgs = ask.json().get("messages") or []
        if len(msgs) < 2 or msgs[-1].get("role") != "assistant":
            fail("assistant reply missing")
        ok("assistant reply")

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
