# Dependency & Secret Audit Report — MetaSphere 2027

**Date:** 2026-11-27  
**Tooling Used:** `npm audit --json`, Node regex & file inventory scanner across all `176` git-tracked files + `git log --all -p -n 25`, manual review of [`src/lib/supabase/config.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/supabase/config.ts), [`src/lib/supabase/admin.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/supabase/admin.ts), [`.env.example`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/.env.example), and [`.gitignore`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/.gitignore)  
**Unavailable Tooling:** `gitleaks` CLI binary is not installed on this workstation; git-history scanning beyond pattern checks requires running `gitleaks detect` before release.

---

## 1. Dependency Vulnerability Audit (`npm audit`)

- **Command:** `npm audit --json`
- **Observed Result:**
  - `info`: `0`
  - `low`: `0`
  - `moderate`: `0`
  - `high`: `0`
  - `critical`: `0`
  - `total`: **`0` known vulnerabilities** (`advisories: []`)
- **Packages Audited:**
  - Production (`18`): `@hookform/resolvers`, `@radix-ui/react-dialog`, `@radix-ui/react-label`, `@radix-ui/react-select`, `@radix-ui/react-slot`, `@radix-ui/react-tabs`, `@supabase/ssr`, `@supabase/supabase-js`, `class-variance-authority`, `clsx`, `lucide-react`, `next`, `react`, `react-dom`, `react-hook-form`, `server-only`, `tailwind-merge`, `zod`
  - Development (`8`): `@playwright/test`, `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss`, `typescript`, `vitest`

---

## 2. Secret & Credential Exposure Audit

- **Tracked File & Commit History Pattern Scan (`audit-runner.mjs`):**
  - Scanned `176` git-tracked text/source files + `git log --all -p -n 25` for AWS keys (`AKIA...`), Google API keys (`AIza...`), PEM private keys, Supabase secret keys (`sb_secret_...`), JWTs (`eyJ...`), Stripe/OpenAI keys (`sk_live_...`), and GitHub PATs (`ghp_...`).
  - **Result:** `secretFindings: []`, `historyFindings: []` (`0` leaked secrets).
- **Client/Server Env Boundary Check:**
  - [`.env.example`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/.env.example) contains empty placeholder keys only (`NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`, `SUPABASE_SECRET_KEY=`).
  - [`.gitignore`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/.gitignore) ignores `.env` and `.env*.local`.
  - [`src/lib/supabase/admin.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/supabase/admin.ts) imports `"server-only"` and enforces `typeof window !== "undefined"` throw. Grep confirmed `createAdminSupabase` is imported ONLY inside `src/features/admin-users/actions.ts` (`"use server"`), and `SUPABASE_SECRET_KEY` is never read in any client bundle.

---

## 3. Hardening Recommendations & Untested Gaps

- **DEP-01 [Low — Informational]: Install & Run `gitleaks` in CI Before Production Handoff** — Our custom regex scan does not match high-entropy unknown secret formats or every legacy pre-25 commit edge case; add `gitleaks` to `.github/workflows/ci.yml` (`gitleaks/gitleaks-action@v2`).
- **DEP-02 [Low — Documentation]: Add `NEXT_PUBLIC_SITE_URL` or Remove Unused Env Dependency** — `src/app/robots.ts` checks `NEXT_PUBLIC_SITE_URL` while `.env.example` does not list it.
