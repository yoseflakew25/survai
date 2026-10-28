# Codebase Progress — SurvAI / AI Survey Copilot

> Living snapshot of what is implemented vs mock vs next.
> Last updated: **26 October 2026** — live through **Plan → Reports** (grounded
> generation, chat, fpdf2 PDF, OOXML DOCX, survey activity modal). Redis ARQ still soft.

Architectural source of truth: `plan.md`. Stack gates: `plan.md` §2a.

---

## 1. Project Shape

| Layer | Path | Status |
| --- | --- | --- |
| Frontend | `frontend/` | Next.js App Router — Plan→Reports wired to live API |
| Backend | `backend/` | FastAPI auth + orgs + plans/surveys/review/collect/respondents/analytics/reports on Aiven Postgres |
| Docs | `plan.md`, `PRODUCT.md`, this file | `plan.md` §23/§25 track current milestone status |

### Domain language (do not confuse)

| Term | Meaning |
| --- | --- |
| **Organization** | The account/workspace that owns surveys (e.g. DICDO). Does everything in MVP. |
| **User (DB)** | Login credentials for that org (1:1 for now). Not multi-seat staff yet. |
| **Respondent** | Person who *fills* a published survey. **No account** — public link only. |

### MVP roles (live)

| Role | Meaning |
| --- | --- |
| `system_admin` | SurvAI platform operator — seeded from `FIRST_SUPERUSER_*` |
| `organization` | Default for all signups and non-platform accounts |

- **Sidebar nav:** `frontend/src/config/nav-config.ts` → `AppSidebar`; icons via `src/components/icons.tsx`.
- **Auth security:** JWT + httpOnly cookies issued by FastAPI (`plan.md` §7). No Google sign-in.
- **FE env:** `frontend/.env` → `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1` (use `localhost`, not `127.0.0.1`, for cookies).
- **Pill nav:** Plan → Review → Collect → Respondents → Analytics → Report + **All surveys**.
- **Survey hub:** removed — `/dashboard/surveys/[id]` redirects to `/plan`.
- **Activity modal:** shared `SurveyActivityProvider` + instrument-style modal for long AI actions across survey tabs.

### Integrity guarantees (live)

- 1 plan ↔ 1 survey (`uq_surveys_plan_id`); plan locks after questions exist.
- Publish once; questions locked when published/closed/archived; no status unlock via PATCH.
- Collect / Respondents / Analytics all use `survey.current_version_id` (stable `/s/{survey_id}`).
- Answer `question_id` has no FK to live draft questions (migration `0012`).
- Reports store a frozen `metrics_snapshot`; narrative numbers must reconcile (§9).
- Report UI surfaces `integrity.is_stale` when live responses diverge from the snapshot.

---

## 2. Backend — done

- FastAPI + SQLAlchemy 2 async + Alembic + Pydantic settings; routes → services → repositories.
- **Auth:** register → email OTP → verify; login/refresh/logout/me; forgot/reset password; JWT + cookies.
- **Email:** Gmail SMTP and/or Resend; `dev_code` when outbound mail unconfigured.
- **Plans + Gemini planner:** CRUD / approve / generate (`planner_v1`).
- **Surveys + Builder AI:** from-plan, generate, section regenerate, section/question CRUD (`builder_v1`).
- **Reviewer AI:** `POST /surveys/{id}/review`, latest, finding status (`reviewer_v1`). Prefer **`gemini-3.1-flash-lite`** for structured JSON — `gemini-3.8-flash` hangs.
- **Collection:** publish / close / collect-stats; public GET + one-shot submit; identity section.
- **Respondents:** list + detail scoped to current version.
- **Analytics:** summary / query / crosstab via `app/analytics/engine.py` (deterministic); CSV export; saved analyses CRUD.
- **Reports:** tables + `report_v1` / compact `chat_v1` + §9 reconciliation; generate / patch / section regen / chat; **PDF via fpdf2** (`report_pdf.py`); **DOCX via OOXML** (`report_docx.py`).
- **Jobs:** `app/jobs/` ARQ scaffold — inline when `REDIS_URL` empty.
- **RBAC:** `system_admin` \| `organization`; startup `ensure_first_superuser()`.
- **Alembic on Aiven:** through **`0013_reports`**.
- Pytest: auth, plans, surveys, collection, reviewer, analytics engine, integrity chain, **report reconciliation**, chat prompt, PDF.
- Docker Compose, GH Actions `backend-ci` / `backend-cd`.

**Run API locally:**
```bash
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 3. Backend — not done yet

- Redis-backed ARQ worker in deploy (`REDIS_URL` + `arq app.jobs.worker.WorkerSettings`).
- Multi-seat org roles; OpenAPI-typed FE client regeneration.
- Optional: WeasyPrint/docxtpl branded templates if donor layout needs rise above current PDF/DOCX.

---

## 4. Frontend — done (live API)

- Cookie auth: sign-in, sign-up + OTP, forgot/reset; Google OAuth remnants removed.
- Plans editor + generate/approve; create survey from plan → Review.
- Reviewer UI (AI review, findings, quality score); locked when published.
- Collect (publish, QR, link); CTA → Respondents.
- Respondents table + detail sheet; brand CTA → Analytics.
- Analytics dashboard (summary, distributions, crosstabs, CSV export).
- **Reports** generate / edit / grounded chat / Save as PDF + Word wired to live API; stale-snapshot banner.
- Shared survey activity modal (page loads + long AI actions).
- BLD-04 pending conditional-logic confirm banner in question editor.
- Pill nav + All surveys; survey detail redirects to Plan.
- Forms: RHF + Zod; TanStack Query for feature data.
- Playwright smoke scaffold (`frontend/e2e/smoke.spec.ts`) — skipped until env vars set.

---

## 5. Frontend — still soft / gaps

- Better Auth UX layer not required for security (JWT cookies are the model).
- Full Playwright path (publish → submit → analytics → report) needs staging credentials.

---

## 6. Known next (priority)

1. Provision Redis and run ARQ worker for long AI/export jobs.
2. Expand Playwright smoke with publish → submit → report happy path.
3. Multi-seat org roles when needed.

---

## 7. Files that matter

**Backend:** `app/main.py`, `api/v1/routes/{auth,plans,surveys,public_collection,reviewer_findings,reports}.py`, `services/{auth,plan,survey,collection,respondents,analytics,reviewer,report,report_pdf,report_docx,email}.py`, `analytics/engine.py`, `ai/{client,schemas,reconciliation,prompts/*,services/*}`, `jobs/*`, `models/*`, `alembic/versions/0001`–`0013`, `tests/test_integrity_chain.py`, `tests/test_report_reconciliation.py`, `tests/test_report_chat_prompt.py`, `tests/test_report_pdf.py`, `tests/test_report_docx.py`

**Frontend:** `lib/auth-context.tsx`, `lib/api.ts`, `features/{plans,builder,reviewer,collect,collection,respondents,analytics,reports,surveys}/**`, `components/survai-panel.tsx`, `features/surveys/components/survey-pill-nav.tsx`, `features/surveys/components/survey-activity-*.tsx`, `e2e/smoke.spec.ts`

---

## 8. Out of this snapshot

- Do not commit secrets (`GEMINI_API_KEY`, `FIRST_SUPERUSER_PASSWORD`, SMTP/Resend) into git.
