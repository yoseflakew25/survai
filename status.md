# Codebase Progress — SurvAI / AI Survey Copilot

> Living snapshot of what is implemented vs mock vs next.
> Last updated: **11 November 2026** — Plan → Reports live; Org Assistant + SSE;
> **multi-seat orgs** (Owner / Researcher / Viewer); collection quota + share
> pack; donor ZIP export; baseline/endline compare; **skip/branch logic
> (BLD-08)**; **saved analysis views** + crosstab `chart_config`; report
> **`?reportId=`** deep-links; **plan interview chat** at `/surveys/new`;
> **CfA Bedrock primary + Gemini backup** AI gateway; **Operate brand chrome**
> (teal `#103344` + bold green `#22f187` panel headers / CTAs); Bearer +
> sessionStorage refresh auth hardening.

Architectural source of truth: `plan.md`. Stack gates: `plan.md` §2a.

---

## 1. Project Shape

| Layer | Path | Status |
| --- | --- | --- |
| Frontend | `frontend/` | Next.js App Router — Plan→Reports + Overview + **Assistant** |
| Backend | `backend/` | FastAPI through Reports/Overview/Notifications/**Assistant**; Aiven Postgres; Railway/Render Docker |
| Docs | `plan.md`, `PRODUCT.md`, this file | `plan.md` §23/§25 track milestones |

### Domain language (do not confuse)

| Term | Meaning |
| --- | --- |
| **Organization** | The account/workspace that owns surveys (e.g. DICDO). |
| **User (DB)** | Seat in an org — Owner, Researcher, or Viewer (email invite). |
| **Respondent** | Person who *fills* a published survey. **No account** — public link only. |

### Org seats (live)

| Role | Meaning |
| --- | --- |
| `system_admin` | SurvAI platform operator — seeded from `FIRST_SUPERUSER_*` |
| `organization` | **Owner** — signup creates org; invite/revoke seats; full mutate |
| `researcher` | Edit/publish/build/report; no seat management |
| `viewer` | Read analytics/reports/assistant; no mutate CTAs |

- **Sidebar nav:** Dashboard, Surveys, **Assistant**, Account (Owner), **Security** (all seats) (`nav-config.ts`).
- **Auth:** JWT (cookies + `Authorization: Bearer`); access JWT in memory;
  refresh in `sessionStorage` (`survai:refresh_v1`); email/password + OTP;
  **Google Identity (GIS)** → same token pair.
- **AI:** CfA sandbox (`CFA_SANDBOX_*`) primary → Bedrock; Gemini backup
  (`GEMINI_*`) via `app/ai/client.py`. Embeddings stay local HF FastEmbed.
- **FE env:** `NEXT_PUBLIC_API_BASE_URL` → API `/api/v1` (use `localhost`, not `127.0.0.1`, for cookies).
- **Prod path:** Vercel FE → Railway/Render API; health `GET`/`HEAD` `/api/v1/health`.
- **Pill nav (survey):** Plan → Review → Collect → Respondents → Analytics → Report + All surveys.
- **Theme:** teal primary `#103344` + brand green `#22f187`; `SurvaiPanel`
  tones (`soft` / `primary` / `brand`); see `DESIGN.md` / `PRODUCT.md`.

### Integrity guarantees (live)

- 1 plan ↔ 1 survey; plan locks after questions exist; publish-once; question lock.
- Published/closed/archived surveys cannot be hard-deleted.
- Collect / Respondents / Analytics use `survey.current_version_id`.
- Reports store frozen `metrics_snapshot`; narrative numbers must reconcile (§9).
- **Org Assistant:** numbers from analytics tools / snapshots only — RAG chunks are narrative context, not a calc engine.

---

## 2. Backend — done

- FastAPI + SQLAlchemy 2 async + Alembic + Pydantic settings; routes → services → repositories.
- **Auth:** register → OTP → verify; login/refresh/logout/me; forgot/reset; **Google OAuth**; JWT cookies + Bearer.
- **Email:** SMTP and/or Resend; `dev_code` when outbound mail unconfigured.
- **AI gateway:** CfA LiteLLM/Bedrock primary + Gemini backup (`AI_PROVIDER=cfa`, `AI_FALLBACK_TO_GEMINI`).
- **Plans / Builder / Reviewer / Collection / Respondents / Analytics / Reports / Overview** — live (see prior milestones).
- **Plan interview (SSE):** `POST /plans/interview/turn/stream` — structured stream with true
  `assistant_reply` token deltas (`iter_stream_structured`), then brief / research_goal / ready flag.
- **Notifications:** in-app feed + unread; emitters on publish / response milestones / report ready / review complete;
  `response_received` deep-links `?respondent=`.
- **Org Assistant (RAG + tools):** Alembic **`0016_org_assistant`**
  - Tables: `assistant_threads`, `assistant_messages`, `org_knowledge_chunks`
  - Index: survey / report / review → chunks with **local HF embeddings** (`fastembed`, `BAAI/bge-small-en-v1.5`)
  - Chat: retrieve top-k → LLM plan (CfA/Gemini) → structured tools (analytics, **saved views**, reports) → grounded answer + citations
  - API: `/assistant/threads`, messages, **`POST …/messages/stream` (SSE)**, `POST /knowledge/reindex`
  - Docker: model pre-baked into image (`EMBEDDING_CACHE_DIR`)
- **Jobs / ARQ:** **inline by default** (`JOBS_USE_REDIS=false`). Redis is opt-in only; exhausted/missing Redis never blocks the API.
- **Org seats:** Alembic **`0017_org_seats`** — `org_invites`; roles researcher/viewer; `POST /auth/accept-invite`; `/org/team` + invites (owner-only mutate).
- **Collection settings:** Alembic **`0018_collection_compare`** — `response_quota`, `closes_at` enforced on public submit + collect-stats.
- **Donor pack:** `POST /reports/{id}/export-pack` → ZIP (PDF + DOCX + analytics CSV).
- **Compare:** `instrument_family_id` / `wave_label`; `POST …/duplicate-as-endline`; `GET …/compare?other_id=`.
- **Skip / branch (BLD-08):** shared `conditional_logic` evaluator (snake + camel);
  public submit + complete skip inactive required questions; builder confirm/clear; multi-rule AND/OR editor.
- **Saved analyses:** `GET`/`POST`/`DELETE /surveys/{id}/saved-analyses`; optional `chart_config` (crosstab axes);
  report create accepts `saved_analysis_id` and freezes filtered metrics in `metrics_snapshot`.
- **Report deep-link:** `GET /reports/{id}`; `notify_report_ready` href includes `?reportId=`.
- **Alembic:** through **`0019_saved_analysis_chart_config`** (includes 0017 + 0018).
- Pytest: `test_dicdo_features` (invite / quota / donor pack) + `test_branching_and_reports`
  (skip-on-submit, saved-view filters/delete, GET by id, Owner→Researcher dogfood) + plan interview + assistant suites.

**Run API locally:**
```bash
cd backend && source .venv/bin/activate
uv pip install -r requirements.txt   # includes fastembed
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Deploy:** `backend/Dockerfile` + `scripts/start.sh` (migrate → uvicorn). See `backend/RAILWAY.md`.

---

## 3. Backend — soft / next

- Confirm prod `REDIS_URL` where async report jobs are desired.
- Run `POST /assistant/knowledge/reindex` once per org after first Assistant deploy (or after embedding model change).
- On Render: leave `JOBS_USE_REDIS=false` (or unset) and clear `REDIS_URL` — no Upstash needed.
- Optional: multi-org switcher / custom role matrices / SSO; pgvector; CSRF with `SameSite=None`.

---

## 4. Frontend — done (live API)

- Auth UI (email/OTP + Google); Plans → Builder → Review → Collect → Respondents → Analytics → Reports.
- Overview KPIs + activity; survey activity modal; pill nav.
- **New survey / plan chat** (`/dashboard/surveys/new` → `PlanGeneratorWorkspace`):
  - Gemini interview SSE (status → true token deltas → done)
  - Brief sidebar with **inline edit** (title, summary, goal, audiences/decisions/constraints)
  - **localStorage draft** resume (`planInterviewDraft:v1`) + **Start over**
  - Generate plan CTA when ready / force after enough turns
  - Assistant-like padded chat shell (not edge-to-edge)
- **Assistant** (`/dashboard/assistant`): thread list + chat, markdown rendering, citation chips, New chat in brand header; fixed shell scroll.
- **Team** (Account → Team): invite researchers/viewers; `/auth/accept-invite`.
- **Security** (`/dashboard/security`): password change for all seats (Account remains Owner-only).
- **Collect:** quota + close datetime settings; share pack (QR + print sheet); progress toward quota.
- **Builder:** interactive preview + multi-rule skip-logic editor (AND/OR, add/remove, confirm/clear).
- **Reports:** Save as PDF / Word; **Download donor pack** ZIP; open via `?reportId=`.
- **Analytics:** Duplicate as endline + compare table; **saved views** (save/apply/delete + crosstab axis `chart_config`).
- Viewer role: mutate CTAs hidden (publish, generate report, etc.).
- Notifications drawer (clickable cards → href); response notifications deep-link `?respondent=`.
- **Design chrome:** `SurvaiPanel` / `SurvaiPanelHeader` with `tone='brand'` on most operate + account section headers; brand CTAs; user chat bubbles `bg-primary`.
- Forms: RHF + Zod; TanStack Query; AuthQueryBoundary for credentialed queries.
- Overview lifecycle funnel (`lifecycle-funnel.tsx`).

---

## 5. Frontend — soft / gaps

- Playwright: set `PLAYWRIGHT_BASE_URL`, `E2E_*`, and on newer Ubuntu hosts `PLAYWRIGHT_CHANNEL=chrome` (bundled browsers unsupported).
- Optional polish: server-side plan interview draft persistence (today: localStorage).

---

## 6. Known next (priority)

1. Optional Redis for async report jobs on Render only if needed.
2. Re-run pilots against remote staging with dedicated `SMOKE_*` / `E2E_*` when available (local pilots green).
3. Optional polish: server-side plan interview draft persistence.
4. Rotate/secure CFA sandbox keys in prod env; keep Gemini as budget backup.

---

## 7. Files that matter

**Backend:** `app/api/v1/routes/{plans,assistant,notifications,reports,...}.py`, `services/{plan,assistant,collection,conditional_logic,knowledge_index,notification,report,...}.py`, `ai/{client,embeddings,prompts/{assistant_v1,planner_interview_v1}.py}` (CfA+Gemini gateway), `core/config.py` (`CFA_SANDBOX_*` / `GEMINI_*`), `models/assistant.py`, `alembic/versions/0016_org_assistant.py` … `0019_saved_analysis_chart_config.py`, `scripts/pilot_{smoke,full_path}.py`, `tests/test_{assistant,branching_and_reports,dicdo_features,plans}.py`

**Frontend:** `components/survai-panel.tsx`, `styles/themes/vercel.css`, `lib/api.ts` / `auth-context.tsx`, `features/plans/components/plan-generator-workspace.tsx`, `features/plans/lib/interview-draft.ts`, `features/assistant/**`, `features/builder/**`, `features/analytics/**`, `features/team/**`, `features/profile/**`, `features/overview/components/lifecycle-funnel.tsx`, `components/chat-markdown.tsx`, `config/nav-config.ts`, `features/{reports,notifications,surveys}/**`, `e2e/smoke.spec.ts`

**Do not commit:** `CFA_SANDBOX_API_KEY`, `GEMINI_API_KEY`, DB/SMTP/Resend secrets, `SMOKE_*` / `E2E_*`.

---

## 8. Out of this snapshot

- Do not commit secrets (`CFA_SANDBOX_API_KEY`, `GEMINI_API_KEY`,
  `FIRST_SUPERUSER_PASSWORD`, SMTP/Resend, `REDIS_URL`, DB URLs,
  `SMOKE_*` / `E2E_*`) into git.
