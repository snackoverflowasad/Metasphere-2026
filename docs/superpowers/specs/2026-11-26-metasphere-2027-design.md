# MetaSphere 2027 Conference Platform — Design Specification

**Date:** 2026-11-26  
**Repository:** `Project-IEM` (MetaSphere Conference Website)  
**Target Platform:** Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase + Vercel

---

## 1. Intent & Why

Convert the 13-page static HTML/CSS/vanilla JS MetaSphere 2026 website into a secure, reusable, database-driven **Conference Management Platform** for **MetaSphere 2027** (`17–18 August 2027`, tentative) and future editions (`2028+`), so non-technical faculty coordinators and organizing committee members can update dates, deadlines, speakers, committees, tracks, sponsors, programme schedules, registration fees, and external links (Microsoft CMT, Microsoft Forms) without developer intervention—while preserving **MetaSphere 2026** as a read-only archive and keeping the existing website's exact visual identity intact.

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Multi-edition CMS:** Separate `2026` (`status = 'archived'`, served under `/2026`) and `2027` (`status = 'published'`, `is_active = true`, served at `/`), enabling yearly reuse without editing code.
- **Non-technical publishing workflow:** `draft` → `preview` → `published` (and `archived`), with immediate on-demand cache invalidation (`revalidateTag`) and version/audit history.
- **Defense-in-depth security:** Invite-only Supabase Auth, mandatory TOTP MFA (`aal2` enforced in PostgreSQL RLS), 3-tier RBAC (`super_admin`, `content_admin`, `editor`) + financial approval gate, server-side Zod validation, safe Storage policies, and immutable `audit_logs`.
- **International readiness:** `timestamptz` with explicit `Asia/Kolkata` (`IST / UTC+5:30`) labeling, separate `INR` and `USD` fee structures, and WCAG 2.2 AA accessibility.
- **Exact visual & media fidelity:** 100% preservation of existing colors, layout, local `Assets/`, and `res.cloudinary.com/dh87hfwml/...` media links.

### Non-Goals
- Building a custom peer-review system (Microsoft CMT remains external, URL managed via CMS).
- Building an online payment gateway (Microsoft Forms + institutional bank/UPI instructions remain managed via CMS).
- Creating public attendee accounts or login walls for conference visitors.

### Anti-Goals
- **Visual drift:** Changing the `#fffbf5` / `#f97316` / `#d946ef` theme, swapping out existing images, or replacing/altering any `res.cloudinary.com` URLs.
- **In-place overwrite of 2026:** Replacing `2026` strings with `2027` and losing the 2026 conference record.
- **Frontend-only security:** Relying on hidden admin UI buttons without server-side auth/RBAC checks and PostgreSQL RLS `aal2` policies.
- **Personal-account lock-in:** Hosting production Supabase/Vercel/GitHub/DNS under a graduating student's personal account.

## 3. Hard Constraints

1. **Theme & Media Preservation:** Keep `#fffbf5` background, `#1a202c` primary text, `#f97316` / `#ea580c` orange accents, `linear-gradient(45deg, #f97316, #d946ef)` gradient text, `#fef3c7` / `#f3eadd` highlights, `Inter` font, existing layouts, local `Assets/` files, and all `https://res.cloudinary.com/dh87hfwml/...` image and video URLs untouched.
2. **Supabase Keys:** Use `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SECRET_KEY`. Never expose `SUPABASE_SECRET_KEY` to client code or `NEXT_PUBLIC_` env vars.
3. **Next.js 16 Runtime:** Use `src/proxy.ts` (`export function proxy(...)`) and two-argument `revalidateTag(tag, { expire: 0 })`.
4. **External Link & Upload Safety:** Only `http://` and `https://` URLs allowed for CMS link fields; admin uploads allow only `image/png`, `image/jpeg`, `image/webp`, and `application/pdf` (no SVG or HTML uploads).
5. **Legacy URL Continuity:** All 13 legacy `.html` paths (`index.html`, `CallPapers.html`, `PaperSubmit.html`, `registration.html`, `Keynote_Speaker.html`, `technical-programs.html`, `TechSponsor.html`, `Contact.html`, `AdvisoryCommittee.html`, `scientific-committee.html`, `TechCommittee.html`, `AAIA.html`, `404.html`) must permanently redirect to their clean App Router equivalents.

## 4. Approaches Considered

| Approach | Summary | Trade-offs | Verdict |
|---|---|---|---|
| **A. Next.js 16 App Router + Supabase PostgreSQL/Auth/RLS/Storage + Vercel** | Full rearchitecture into Server Components + protected `/admin` CMS + relational edition schema with `aal2` RLS | Requires initial schema & CMS build effort, but delivers clean relational editions, strict RLS, draft/preview/publish, and long-term maintainability | **Chosen** |
| **B. Wrap existing HTML in React + static JSON/Markdown files** | Keep HTML markup inside React components and store dates/speakers in Git JSON | Eliminates DB setup, but faculty still need GitHub/PRs or a headless Git CMS; no RBAC, audit logs, or relational programme/edition model | Rejected |
| **C. Firebase Hosting + Firestore** | Reuse existing `.firebaserc` / `firebase.json` hosting config and model data in Firestore | Existing repo has no Firestore/Auth code; relational links (editions ↔ people ↔ committees ↔ sessions ↔ tracks) and SQL policy testing are cleaner in PostgreSQL + RLS | Rejected |

## 5. Decided Architecture

- **Public Layer (`(public)` & `/2026`):** Next.js 16 Server Components querying cached published records for the active edition (`2027`) or archived edition (`2026`), preserving exact CSS/Tailwind classes and Cloudinary/local assets.
- **Admin Layer (`/admin`):** Invite-only email/password login (`/admin/login`) → mandatory TOTP MFA (`/admin/mfa`, `aal2`) → modular CMS (`/admin/overview`, `event-settings`, `deadlines`, `speakers`, `committees`, `tracks`, `programme`, `sponsors`, `registration`, `resources`, `users`, `activity`) built with React Hook Form, Zod, and shadcn/ui.
- **Database & RLS:** 16 PostgreSQL tables centered on `conference_editions` (`year`, `status`, `is_active`, `timezone = 'Asia/Kolkata'`). Restrictive RLS enforces `(select auth.jwt()->>'aal') = 'aal2'` on all authenticated writes and draft reads; `registration_fees` publication additionally requires `can_approve_financial` or `super_admin`.

## 6. Left to the Builder (Within Constraints)

- Exact shadcn/ui component styling inside `/admin` (isolated from the untouched public theme).
- Exact Zod error copy and pagination/filtering UX in `/admin` tables.
- Institutional ownership setup details (IEM-controlled GitHub org, Supabase org, Vercel team, `iem.edu.in` DNS handoff, and initial faculty Super Admin emails) documented in the Phase 7 runbook.
