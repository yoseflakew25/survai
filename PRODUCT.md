# Survey Copilot

## Product
AI-assisted survey lifecycle platform (Plan → Build → Review → Collect → Analyze → Report) for M&E / CSO teams. Pilot partner: DICDO via Code for Africa.

## Audience
Researchers and program staff who need trustworthy survey workflows where AI never invents statistics.

## Brand commitments (session)
- Visual world for the product UI is explicitly pinned to [Launchpot](https://launchpot.space/board): warm paper ground (`#f7f7f2`), lime brand (`#c6f432`), Geist + Bricolage Grotesque, pill nav, soft borders, board-list density.
- First surface: recreate the Launchpot `/board` landing as `/` pixel-faithfully (layout, tokens, motion, chrome). Product rebrand of copy/identity follows after the aesthetic lands.

## Assumptions
- Frontend-only for now; mock board data is fine.
- Dashboard routes remain at `/dashboard/*` until the theme is rolled through the app.

## Frontend stack (canonical)
- **shadcn/ui** — UI primitives
- **Auth security** — JWT + httpOnly cookies (API is source of truth)
- **Better Auth** — frontend auth UX / client helpers only (not a second backend)
- **TanStack Query** — server/async state
- **React Hook Form + Zod** — forms and validation
- **Zustand** — client UI state

Do not expand Clerk, TanStack Form, or alternate UI/data libraries. Do not put access tokens in localStorage.
