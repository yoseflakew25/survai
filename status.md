# Codebase Progress — AI Survey Copilot

> Living snapshot of what has been implemented in the frontend UI so far,
> what is still in mock/hardcoded form, and where the known gaps are.
> Updated after the latest session work (sidebar icon completion, dead-build
> card removal, respondents + respondent-detail UI work).

---

## 1. Project Shape

- **One Next.js app** (`frontend/`) on the App Router with a
  `dashboard/*` shell and `(auth)/*` pages.
- **Sidebar nav** is driven by `src/config/nav-config.ts` (groups →
  items → optional sub-items), rendered in `AppSidebar`.
- **Icons** live in `src/components/icons.tsx`: a mix of Tabler imports and
  inline SVG shims, all keyed into the `Icons` record. Nav items reference
  them by string key (`icon: 'dashboard'`).
- **Stepper/header consistency** across the survey modules (Build, Review,
  Collect, Analytics, Reports) is currently the one area still being normalized.

## 2. Completed (frontend UI, recent)

- **Sidebar dashboard icon:** nav config already had `icon: 'dashboard'`;
  `Icons.dashboard` was wired up and updated to the requested multi-panel
  dashboard SVG (`#564597` fill, `viewBox 0 0 24 24`). Dashboard row now
  renders its icon.
- **Survey detail (hub) page:** the dead "Build" card was removed;
  module cards now expose only Build / Review / Collect / Analytics / Reports,
  each wired to its real route via `MODULES` config.
- **Respondents page:**
  - Heading on its own at the top.
  - Single row below it: sort pills (Date & time, Alphabetically) + stats
    cards (Total / Completed / Partial / Avg. Duration) + existing toolbar
    (search + status filter).
  - Status column header is now a dropdown filter (All / Completed / Partial).
  - Respondent column header has an in-header search input.
  - View/hide-columns button removed everywhere (DataTableViewOptions
    neutralized; surveys table cleaned up too).
- **Respondent detail page:**
  - Breadcrumb: Survey → Respondents → respondent name.
  - Header shows name/email, status, submitted time, duration, answered count.
  - Answers rendered as section cards with prefilled-survey-style question
    prompt + answer value (checked chips for multi, highlighted value for
    single/dropdown/text/number, small scale bar + n/max for ratings).
  - Sidebar keeps Submission and Survey summary cards on wider screens.

## 3. Still mock / hardcoded

- **Overview dashboard** (`dashboard/overview/*`): area/bar/pie stats and the
  surveys list all render hardcoded numbers and mock shapes; no real query
  wiring yet.
- **Survey module interiors** (Build, Review, Collect, Analytics, Reports):
  scaffolding + skeletons exist, but most content is still mock-detail-level;
  stepper/header styling consistency across all five is still being normalized.
- **Survey list table** and **respondents/surveys pagination** are real in
  structure, but the underlying data is still mock until the API is live.

## 4. Known gaps / next-ish

- Finish normalizing the stepper + header row across all five survey modules
  so they all look like one system (compact stepper, side-by-side header
  where appropriate).
- Wire the dashboard overview to real query hooks once the backend is up.
- Take the same compact, consistent treatment into the Reports, Analytics, and
  Review pages where it has not yet landed.
- Keep icon coverage in sync: any new nav item or UI feature that expects an
  icon must also add the key to `Icons` (Tabler import or inline shim) before
  it lands.

## 5. Nav / sidebar health

- Nav config: Dashboard, Surveys, Account (+ Profile, Settings, Notifications
  sub-items).
- Icon keys in `Icons` for: `dashboard`, `survey`, `account`, `profile`,
  `settings`, `notification`, `chevronRight`, `chevronsDown`, `logout`.
- Sidebar renders `Icons[item.icon]` for every item, so a missing key would
  show nothing — that is the failure mode to watch for on new nav items.

## 6. Files that matter for "where are we"

- `frontend/src/config/nav-config.ts`
- `frontend/src/components/icons.tsx`
- `frontend/src/components/layout/app-sidebar.tsx`
- `frontend/src/app/dashboard/surveys/[surveyId]/page.tsx`
- `frontend/src/app/dashboard/surveys/[surveyId]/respondents/page.tsx`
- `frontend/src/features/respondents/components/respondents-view.tsx`
- `frontend/src/features/respondents/components/columns.tsx`
- `frontend/src/features/respondents/components/respondent-detail-view.tsx`
- `frontend/src/app/dashboard/overview/layout.tsx`

## 7. Not in scope for this snapshot

- Backend schema, API routes, AI orchestration — this file tracks frontend UI
  progress only, per the current session focus.
- Auth pages redesign notes are out of date and should be re-captured
  separately if they still matter.
