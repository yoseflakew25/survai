# SurvAI System Admin Console

Platform operators (`role=system_admin`, `is_superuser=true`) use a separate UI at **`/admin`**, not the org `/dashboard`.

## Access

1. Bootstrap admin is created on API startup from `FIRST_SUPERUSER_*` env vars.
2. Sign in on the normal auth pages — system admins are redirected to `/admin/overview`.
3. Non-admins hitting `/admin/*` are redirected to `/dashboard/overview`.
4. All `/api/v1/admin/*` routes require `AdminUser` (server-side).

## Capabilities

| Area | What it does |
| --- | --- |
| Overview | Platform KPIs (orgs, users, surveys, responses, AI) |
| Organizations | Search, suspend/reactivate, notes, feature flags, inspect |
| Users | List/create/deactivate across orgs |
| Activity log | `audit_log` feed (suspend, flags, impersonation, …) |
| AI usage | `ai_generation_logs` with error rate |
| System health | Jobs mode + Redis configured |
| Impersonate | Act as an org owner for up to 60 minutes |

## Feature flags (per org)

Missing key = **enabled**. Explicit `false` disables:

- `ai_planner`, `ai_builder`, `ai_reviewer`, `ai_report`, `ai_assistant`
- `publish_survey`, `collect_responses`, `exports`

Enforced in the corresponding backend services (not UI-only).

## Impersonation safety

- Starts with `POST /api/v1/admin/orgs/{id}/impersonate`
- Access JWT includes `impersonation=true` + `impersonator_id`
- Sticky banner on `/dashboard` and `/admin` with **Exit impersonation**
- Stop via `POST /api/v1/admin/impersonate/stop` (restores admin session)
- Cannot impersonate another system admin or a suspended org
- Start/stop always write audit rows

## Env reminders

- `FRONTEND_URL` / `CORS_ORIGINS` must be the public frontend (email + cookie flows)
- Keep `FIRST_SUPERUSER_PASSWORD` strong in production
