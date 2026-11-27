# Functional QA Report — MetaSphere 2027

**Date:** 2026-11-27  
**Tooling Used:** Existing Playwright suite (`npx playwright test --reporter=list` — `9/9` passed), Vitest suite (`npx vitest run` — `79/79` passed across `9` files), and full-site Playwright crawler (`audit-runner.mjs` against `127.0.0.1:3006`)

---

## 1. Functional Runtime Results

- **Route Rendering (`26` routes):** All 12 MetaSphere 2027 public routes, all 12 `/2026` archived routes, `/admin/login`, and `/admin/mfa` (redirected cleanly to `/admin/login` while unconfigured) rendered with **0 console errors**, **0 uncaught `pageerror` events**, and **0 failed same-origin requests**.
- **Responsive Viewport Overflow:** Tested at desktop (`1440×900`) and mobile (`390×844`) across all 26 routes — **0 horizontal overflow (`scrollWidth - innerWidth === 0`)** on every route.
- **Interactive UI Controls Verified Live:**
  - Track Modal on `/` opens on clicking `"View Tracks"` and closes cleanly on `Escape`.
  - Mobile navigation hamburger drawer opens cleanly at `390×844`.
  - Committee directory search on `/committees/advisory` dynamically filters rows (`"Kolkata"` returned `6` matching rows) and toggles National (`#f97316` pill) vs International cleanly.
  - Header `"Authors"` / `"Committee"` dropdowns open and dismiss via keyboard `Enter` / `Escape`.
  - Unauthenticated requests to `/admin/overview`, `/admin/users`, and `/admin/registration` all return HTTP `307` -> `/admin/login`.
  - Unknown route (`/nonexistent-404-check`) returns HTTP `404`.

---

## 2. Functional Findings & Gaps

### QA-01 [Medium — Confirmed]: Archived `/2026` Sub-Pages Receive `edition={2026}` Without `basePath="/2026"`
- **Affected File:** [`src/app/2026/[...slug]/page.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/2026/%5B...slug%5D/page.tsx#L71-L95)
- **Evidence:** [`Archive2026HomePage`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/2026/page.tsx#L15) passes `basePath="/2026"` to `<HomePageView edition={edition} basePath="/2026" />`, keeping `/` CTA buttons scoped to `/2026/registration`. While sub-pages (`CallForPapersView`, `RegistrationView`, etc.) currently use external links, `PublicHeader` and `PublicFooter` receive `basePath="/2026"` from `Archive2026Layout`, whereas `src/app/2026/[...slug]/page.tsx` does not forward `basePath="/2026"` to child views should internal links be added later.
- **Recommended Fix:** Forward `basePath="/2026"` consistently if sub-page views link to sibling edition routes.

### QA-02 [Low — Confirmed]: Documentation Reference Mismatch (`docs/operations/supabase-handoff.md` Referenced in Auth UI)
- **Affected Files:** [`src/app/admin/login/LoginForm.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/admin/login/LoginForm.tsx#L44), [`src/app/admin/mfa/MfaFlow.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/admin/mfa/MfaFlow.tsx#L269), [`src/lib/auth/session.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/auth/session.ts#L73)
- **Evidence:** Both `docs/operations/supabase-handoff.md` and `docs/operations/production-cutover-runbook.md` exist; verify both stay synchronized with exact table (`admin_roles`) and role names (`super_admin`, `content_admin`, `editor`) before handoff.

---

## 3. Untested Functional Areas

- **Authenticated Admin CRUD End-to-End (`(dashboard)/*`):** Admin dashboard pages (`/admin/overview`, `/event-settings`, `/deadlines`, `/speakers`, `/committees`, `/tracks`, `/programme`, `/sponsors`, `/registration`, `/users`, `/activity`) compile and pass server unit tests with mocks, but **live form submission, toast/error states, pagination/editing, draft preview toggling via `/api/preview`, and Supabase Storage file upload UX remain untested** without a live Supabase instance.
- **Cross-Browser Matrix:** Tested in headless Chromium only; Firefox and WebKit (Safari) were not executed.
