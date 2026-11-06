# Codebase Progress — SurvAI / AI Survey Copilot

> Living snapshot of what is implemented vs mock vs next.
> Last updated: **6 November 2026** — Plan → Reports live; **Org Assistant
> (RAG + structured tools)**; HF local embeddings; in-app notifications;
> Google OAuth; light Launchpot theme; Docker bake for embeddings; Render +
> Vercel deploy path.

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
| **Organization** | The account/workspace that owns surveys (e.g. DICDO). Does everything in MVP. |
| **User (DB)** | Login credentials for that org (1:1 for now). Not multi-seat staff yet. |
| **Respondent** | Person who *fills* a published survey. **No account** — public link only. |

### MVP roles (live)

| Role | Meaning |
| --- | --- |
| `system_admin` | SurvAI platform operator — seeded from `FIRST_SUPERUSER_*` |
| `organization` | Default for all signups and non-platform accounts |

- **Sidebar nav:** Dashboard, Surveys, **Assistant**, Account (`nav-config.ts`).
- **Auth:** JWT + httpOnly cookies; email/password + OTP; **Google Identity (GIS)** → same cookies.
- **FE env:** `NEXT_PUBLIC_API_BASE_URL` → API `/api/v1` (use `localhost`, not `127.0.0.1`, for cookies).
- **Prod path:** Vercel FE → Railway/Render API; health `GET`/`HEAD` `/api/v1/health`.
- **Pill nav (survey):** Plan → Review → Collect → Respondents → Analytics → Report + All surveys.
- **Theme:** Launchpot-derived light world (warm paper + lime brand); see `DESIGN.md` / `PRODUCT.md`.

### Integrity guarantees (live)

- 1 plan ↔ 1 survey; plan locks after questions exist; publish-once; question lock.
- Published/closed/archived surveys cannot be hard-deleted.
- Collect / Respondents / Analytics use `survey.current_version_id`.
- Reports store frozen `metrics_snapshot`; narrative numbers must reconcile (§9).
- **Org Assistant:** numbers from analytics tools / snapshots only — RAG chunks are narrative context, not a calc engine.

---

## 2. Backend — done

- FastAPI + SQLAlchemy 2 async + Alembic + Pydantic settings; routes → services → repositories.
- **Auth:** register → OTP → verify; login/refresh/logout/me; forgot/reset; **Google OAuth**; JWT + cookies.
- **Email:** SMTP and/or Resend; `dev_code` when outbound mail unconfigured.
- **Plans / Builder / Reviewer / Collection / Respondents / Analytics / Reports / Overview** — live (see prior milestones).
- **Notifications:** in-app feed + unread; emitters on publish / response milestones / report ready / review complete.
- **Org Assistant (RAG + tools):** Alembic **`0016_org_assistant`**
  - Tables: `assistant_threads`, `assistant_messages`, `org_knowledge_chunks`
  - Index: survey / report / review → chunks with **local HF embeddings** (`fastembed`, `BAAI/bge-small-en-v1.5`)
  - Chat: retrieve top-k → Gemini plan → structured tools → grounded answer + citations
  - API: `/assistant/threads`, messages, **`POST …/messages/stream` (SSE)**, `POST /knowledge/reindex`
  - Docker: model pre-baked into image (`EMBEDDING_CACHE_DIR`)
- **Jobs / ARQ:** optional `REDIS_URL` for report **and export** 202 + poll; inline fallback; `GET /health` reports `jobs.redis`.
- **Alembic:** through **`0016_org_assistant`**.
- Pytest: assistant isolation/retrieve/chat; plus existing suites (auth tests may fail if live Resend key returns 403 in local env).

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
- Multi-seat org roles; OpenAPI-typed FE client regeneration.
- Optional: pgvector when chunk volume grows (v1 uses JSON embeddings + in-process cosine).
- CSRF with `SameSite=None` cookies if needed.

---

## 4. Frontend — done (live API)

- Auth UI (email/OTP + Google); Plans → Builder → Review → Collect → Respondents → Analytics → Reports.
- Overview KPIs + activity; survey activity modal; pill nav.
- **Assistant** (`/dashboard/assistant`): thread list + chat, markdown rendering, citation chips, New chat in brand header.
- Notifications drawer; Launchpot light theme chrome (`SurvaiPanel`, brand CTAs).
- Forms: RHF + Zod; TanStack Query.

---

## 5. Frontend — soft / gaps

- Full Playwright path needs staging creds (`E2E_*`). Assistant UI smoke sends a starter and waits for a reply.
- API pilots: `pilot_smoke.py` + `pilot_full_path.py` cover report → PDF → **assistant**.

---

## 6. Known next (priority)

1. Set prod `REDIS_URL` (Upstash `rediss://`) if async report/export jobs are desired; check `GET /health` → `jobs.redis=ok`.
2. Run `pilot_full_path.py` / Playwright with staging `SMOKE_*` / `E2E_*` after deploy.
3. Multi-seat org roles when DICDO needs staff invites.

---

## 7. Files that matter

**Backend:** `app/api/v1/routes/{assistant,notifications,...}.py`, `services/{assistant,knowledge_index,notification,...}.py`, `ai/{client,embeddings,prompts/assistant_v1.py}`, `models/assistant.py`, `alembic/versions/0016_org_assistant.py`, `Dockerfile`, `tests/test_assistant.py`

**Frontend:** `features/assistant/**`, `components/chat-markdown.tsx`, `config/nav-config.ts`, `features/{reports,notifications,surveys,overview}/**`

---

## 8. Out of this snapshot

- Do not commit secrets (`GEMINI_API_KEY`, `FIRST_SUPERUSER_PASSWORD`, SMTP/Resend, `REDIS_URL`, DB URLs) into git.
