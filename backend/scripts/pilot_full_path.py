#!/usr/bin/env python3
"""Full prod pilot: Redis check → plan+survey → publish → N responses → report → PDF.

  cd backend && source .venv/bin/activate
  export SMOKE_API_BASE=https://survai-mzam.onrender.com/api/v1
  export SMOKE_EMAIL=… SMOKE_PASSWORD=…
  python scripts/pilot_full_path.py
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
N_RESPONSES = int(os.environ.get("SMOKE_RESPONSES", "3"))
SURVEY_ID = os.environ.get("SMOKE_SURVEY_ID", "").strip()


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"OK   {msg}")


def _poll_job(
    client: httpx.Client, headers: dict[str, str], job_id: str
) -> dict[str, Any]:
    deadline = time.time() + 420
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


def _fake_value(q: dict[str, Any], i: int) -> Any:
    qtype = (q.get("type") or "").lower()
    opts = q.get("options") or []
    rules = q.get("validation_rules") or {}
    key = rules.get("survai_key")
    if key == "first_name":
        return f"Pilot{i}"
    if key == "last_name":
        return f"Respondent{i}"
    if key == "email":
        return f"pilot{i}@example.com"
    if key == "phone":
        return f"+1555000{i:04d}"
    if qtype in ("rating_scale", "number", "numeric", "scale", "likert", "rating"):
        lo = int(rules.get("min", 1) or 1)
        hi = int(rules.get("max", 5) or 5)
        return lo + (i % max(1, hi - lo + 1))
    if qtype in ("single_choice", "yes_no"):
        if opts:
            return opts[i % len(opts)].get("value", opts[i % len(opts)])
        return "yes"
    if qtype in ("multi_choice", "multiple_choice"):
        if opts:
            return [opts[i % len(opts)].get("value", opts[i % len(opts)])]
        return []
    return f"Pilot answer {i} for {q.get('prompt_text', 'q')[:40]}"


def main() -> None:
    if not EMAIL or not PASSWORD:
        fail("Set SMOKE_EMAIL and SMOKE_PASSWORD")

    with httpx.Client(base_url=API, timeout=180.0, follow_redirects=True) as client:
        health = client.get("/health")
        if health.status_code != 200:
            fail(f"health → {health.status_code}")
        ok("health")

        login = client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
        if login.status_code != 200:
            fail(f"login → {login.status_code} {login.text[:200]}")
        tokens = login.json()
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        ok(f"login as {tokens['user']['email']}")

        # --- Redis / ARQ ---
        probe = client.get(
            "/jobs/00000000-0000-0000-0000-000000000001", headers=headers
        )
        if probe.status_code != 200:
            fail(f"jobs probe → {probe.status_code}")
        perr = (probe.json() or {}).get("error")
        if perr == "Job queue is not configured":
            fail("REDIS_URL empty on this API — report jobs will run inline")
        ok("REDIS_URL configured (ARQ job status reachable)")

        pub_body: dict[str, Any]
        if SURVEY_ID:
            survey_id = SURVEY_ID
            stats0 = client.get(f"/surveys/{survey_id}/collect-stats", headers=headers)
            if stats0.status_code != 200:
                fail(f"reuse survey → {stats0.status_code} {stats0.text[:200]}")
            pub_body = {
                "collection_path": stats0.json().get("collection_path")
                or f"/s/{survey_id}",
                "version_number": None,
            }
            ok(f"reusing survey {survey_id}")
        else:
            # --- Plan + AI ---
            goal = (
                "Pilot smoke: measure satisfaction with a community health outreach "
                "program among adult participants in the last 6 months."
            )
            plan_res = client.post(
                "/plans/generate",
                headers=headers,
                json={"research_goal": goal},
                timeout=300.0,
            )
            if plan_res.status_code not in (200, 201):
                fail(f"plan generate → {plan_res.status_code} {plan_res.text[:400]}")
            plan = plan_res.json().get("plan") or plan_res.json()
            plan_id = plan["id"]
            ok(f"plan {plan_id}")

            # --- Survey from plan ---
            from_plan = client.post(
                "/surveys/from-plan",
                headers=headers,
                json={
                    "plan_id": plan_id,
                    "title": "Pilot — Community Health Outreach",
                    "generate": True,
                },
                timeout=300.0,
            )
            if from_plan.status_code not in (200, 201):
                fail(f"from-plan → {from_plan.status_code} {from_plan.text[:400]}")
            survey = from_plan.json()["survey"]
            survey_id = survey["id"]
            ok(f"survey {survey_id} status={survey.get('status')}")

            # --- Publish ---
            pub = client.post(f"/surveys/{survey_id}/publish", headers=headers)
            if pub.status_code != 200:
                fail(f"publish → {pub.status_code} {pub.text[:300]}")
            pub_body = pub.json()
            ok(
                f"published version={pub_body.get('version_number')} "
                f"path={pub_body.get('collection_path')}"
            )

        # --- Public form + responses ---
        public = client.get(f"/public/surveys/{survey_id}")
        if public.status_code != 200:
            fail(f"public survey → {public.status_code} {public.text[:300]}")
        form = public.json()
        questions: list[dict[str, Any]] = []
        for sec in form.get("sections") or []:
            questions.extend(sec.get("questions") or [])
        if not questions:
            fail("public survey has no questions")
        ok(f"public form questions={len(questions)}")

        before = client.get(f"/surveys/{survey_id}/collect-stats", headers=headers)
        if before.status_code != 200:
            fail(f"collect-stats before → {before.status_code}")
        baseline = int(before.json().get("response_count") or 0)

        for i in range(1, N_RESPONSES + 1):
            answers = []
            for q in questions:
                if not q.get("is_required") and i % 2 == 0:
                    continue
                answers.append({"question_id": q["id"], "value": _fake_value(q, i)})
            for q in questions:
                if q.get("is_required") and not any(
                    a["question_id"] == q["id"] for a in answers
                ):
                    answers.append({"question_id": q["id"], "value": _fake_value(q, i)})
            sub = client.post(
                f"/public/surveys/{survey_id}/submit",
                json={"answers": answers},
                timeout=60.0,
            )
            if sub.status_code != 200:
                fail(f"submit #{i} → {sub.status_code} {sub.text[:400]}")
            ok(f"response #{i} id={sub.json().get('id')}")

        stats = client.get(f"/surveys/{survey_id}/collect-stats", headers=headers)
        if stats.status_code != 200:
            fail(f"collect-stats → {stats.status_code}")
        count = int(stats.json().get("response_count") or 0)
        expected = baseline + N_RESPONSES
        if count != expected:
            fail(f"expected {expected} responses (baseline {baseline}+{N_RESPONSES}), got {count}")
        ok(f"collect-stats responses={count}")

        summary = client.get(
            f"/surveys/{survey_id}/analytics/summary", headers=headers
        )
        if summary.status_code != 200:
            fail(f"analytics → {summary.status_code} {summary.text[:200]}")
        ok("analytics summary")

        # --- Report ---
        gen = client.post(
            f"/surveys/{survey_id}/reports",
            headers=headers,
            json={"audience": "internal"},
            timeout=300.0,
        )
        if gen.status_code == 202:
            job_id = gen.json()["job_id"]
            ok(f"report queued (ARQ) job_id={job_id}")
            report = _poll_job(client, headers, job_id)
        elif gen.status_code in (200, 201):
            report = gen.json()
            ok(f"report inline id={report['id']} (queue not used)")
        else:
            fail(f"generate report → {gen.status_code} {gen.text[:400]}")

        export = client.post(
            f"/reports/{report['id']}/export",
            headers=headers,
            json={"type": "pdf"},
            timeout=120.0,
        )
        if export.status_code == 202:
            job_id = export.json()["job_id"]
            ok(f"pdf export queued job_id={job_id}")
            _poll_job(client, headers, job_id)
            ok("pdf export job complete")
        elif export.status_code in (200, 201):
            body = export.json()
            if not body.get("content_base64") and not body.get("file_url"):
                fail("pdf export missing content")
            ok(f"pdf export ({body.get('status')})")
        else:
            fail(f"pdf export → {export.status_code} {export.text[:200]}")

    print("\nFull pilot path passed.")
    print(f"Survey: {survey_id}")
    print(f"Collect: {pub_body.get('collection_path')}")


if __name__ == "__main__":
    main()
