# Production Readiness Report — MetaSphere 2027

**Date:** 2026-11-27  
**Repository State:** Branch `feat/metasphere-2027-platform` @ commit `5cdbea6`  
**Audit Mode:** Strictly read-only inspection & non-destructive localhost testing  

---

## 1. Overall Readiness Verdict: **CONDITIONAL NO-GO (Staging Integration & Pre-Launch Fixes Pending)**

The Next.js 16 + TypeScript + Tailwind CSS 4 public platform builds cleanly (`30/30` static/SSG pages), passes all `79` Vitest unit/integration tests and `9` Playwright E2E tests, exhibits `0` dependency CVEs and `0` leaked secrets, and preserves all `#fffbf5` theme tokens, 22 local assets, and 36 Cloudinary URLs.

**However, the application CANNOT be declared production-ready yet because:**
1. Live Supabase authentication, TOTP MFA enrollment/verification, PostgreSQL migrations, RLS policies, and Storage uploads have **not been connected or dynamically tested** against a live staging database.
2. Live **Strix**, **pgTAP**, **axe-core**, **Lighthouse**, and **gitleaks** runs have **not yet been executed** (binaries/Docker daemon unavailable locally).
3. Several confirmed security, accessibility, SEO, and operational documentation issues require remediation prior to live traffic cutover.

---

## 2. Prioritized Pre-Production Action Plan

### Must-Fix Before Connecting Real Admin Data & Production Cutover
1. **[Content — LNK-01]** Create the **MetaSphere 2027** Microsoft CMT track and MS Forms URLs and update `2027` resources in `/admin/resources` (currently seeded with 2026 portal URLs).
2. **[Security — API-01 / STRX-01]** Add binary magic-byte inspection (`PNG`, `JPEG`, `WEBP`, `PDF`) and orphan cleanup on audit-log failure inside `src/features/resources/upload-action.ts`, and tighten Storage RLS key regex in `0004_storage_buckets_and_policies.sql`.
3. **[Security — API-02 / STRX-02]** Escape `<` as `\u003c` in `HomePageView.tsx` JSON-LD `dangerouslySetInnerHTML`.
4. **[Auth/Security — AUTH-01]** Call `adminSupabase.auth.admin.signOut(data.userId)` on admin role deactivation/demotion and log prior role data in `audit_logs.before_data`.
5. **[Operations — AUTH-03]** Fix `docs/operations/production-cutover-runbook.md` to use `public.admin_roles` (with `display_name`, `can_approve_financial`) and `'super_admin' | 'content_admin' | 'editor'` instead of `admin_users` / `program_chair` / `registration_treasurer`.

### Strongly Recommended Before Public Launch
6. **[A11Y — A11Y-01, A11Y-03, A11Y-04]** Fix white header nav link contrast on non-video subpages (`~2.15:1` over `bg-black/30` + `#fffbf5`), add skip-to-content link, and normalize heading hierarchy (`h2` footer headings instead of `h4`). (Review visual tradeoffs on `#f97316` button contrast `~2.80:1` with stakeholders.)
7. **[SEO — SEO-01, SEO-02, SEO-03]** Remove duplicate `"| MetaSphere"` title suffix on subpages, emit `metadataBase` + per-route canonical URLs across all active and `/2026` pages, and unify `robots.ts` + `sitemap.ts` URL sourcing.
8. **[Security Hardening — API-03, API-04, RLS-01, AUTH-02]** Switch `/api/preview` draft-mode mutation away from unguarded `GET` (verify `Sec-Fetch-Site` or convert to `POST`), add `Cache-Control: private, no-store` on `/admin/:path*`, pin `SET search_path = public` on `public.set_updated_at()`, and enforce financial check on `published -> draft` downgrade in `checkStatusPermission`.
9. **[Performance — PERF-01]** Optimize the ~4.9 MB raster-heavy SVGs (`METASPHERE WEBSITE BANNER .svg`, `01.svg`, `003.svg`) after stakeholder sign-off.

---

## 3. Complete Verification Matrix (Tested vs. Untested)

| Area | Verification Status | Tool / Method Used | Result |
|---|---|---|---|
| TypeScript & Build | **Tested** | `npx tsc --noEmit`, `npm run build` | Passed (`0` errors, `30/30` static/SSG pages) |
| Unit & Static Integration Tests | **Tested** | `npx vitest run` | Passed (`9` files, `79/79` tests) |
| Playwright E2E Suite | **Tested** | `npx playwright test --reporter=list` | Passed (`9/9` Chromium tests) |
| Full-Site Link, Redirect & Asset Crawl | **Tested** | `audit-runner.mjs` (`127.0.0.1:3006` & `:3007`) | Passed (`26` routes, `13` redirects, `23` internal, `5` external, `0` broken images on `load`) |
| Dependency & Pattern Secret Scan | **Tested** | `npm audit --json`, regex scan over `176` files + `25` commits | `0` CVEs, `0` leaked credentials found |
| White-Box Auth, RBAC, API, RLS Code Review | **Tested** | Full source & migration review | Verified guard architecture; `9` hardening/bug findings documented |
| Accessibility DOM & Contrast Inspection | **Partially Tested** | Chromium DOM + computed-style checks | `0` missing alts/labels; **4 WCAG issues found** (`axe-core` not run) |
| Strix Dynamic Pentest (Repo & Staging URL) | **Untested** | `strix` CLI + Docker Linux engine | Unavailable locally (binary missing, Docker daemon stopped) |
| Live Multi-Role Auth, TOTP MFA & Admin CRUD | **Untested** | Live Supabase Auth + Staging Browser | Supabase intentionally unconfigured locally |
| PostgreSQL Live Migrations, `pgTAP` & PITR | **Untested** | `supabase db push` + `pgTAP` | Requires linked Supabase / local Docker Postgres |
| `axe-core`, Lighthouse CWV, `gitleaks` CI | **Untested** | External CLIs | CLIs not installed locally |

---

## 4. Exact Follow-Up Gate Before Launching MetaSphere 2027

1. Provision staging Supabase project -> push `0001..0004` + `seed.sql` -> run `pgTAP` / multi-role RLS tests across `anonymous`, `editor`, `content_admin`, and `super_admin`.
2. Patch confirmed findings in the 10 audit reports (`STRX-*`, `AUTH-*`, `RLS-*`, `API-*`, `SEO-*`, `A11Y-*`, `LNK-01`).
3. Run `strix -n -t ./ -t https://<staging-domain> --scan-mode deep --max-budget 25` with scoped staging accounts (never against `metasphere2026.iem.edu.in` without explicit authorization).
4. Run `@axe-core/playwright`, `lighthouse`, and `gitleaks` in staging/CI and confirm zero critical/high blockers remain.
