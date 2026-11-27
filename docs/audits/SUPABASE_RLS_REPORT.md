# Supabase RLS & Database Security Report — MetaSphere 2027

**Date:** 2026-11-27  
**Scope:** [`supabase/migrations/0001_core_editions_and_cms.sql`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/supabase/migrations/0001_core_editions_and_cms.sql), [`0002_admin_rbac_and_audit.sql`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/supabase/migrations/0002_admin_rbac_and_audit.sql), [`0003_rls_policies_and_aal2.sql`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/supabase/migrations/0003_rls_policies_and_aal2.sql), [`0004_storage_buckets_and_policies.sql`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/supabase/migrations/0004_storage_buckets_and_policies.sql)

---

## 1. Verified Database & RLS Controls

- **100% RLS Coverage Across All 16 Tables:** `0003_rls_policies_and_aal2.sql` enables RLS on all 16 public tables (`conference_editions`, `site_settings`, `deadlines`, `tracks`, `people`, `speakers`, `committees`, `committee_members`, `sponsors`, `program_sessions`, `resources`, `conference_links`, `registration_fees`, `admin_roles`, `audit_logs`, `content_versions`).
- **Mandatory `aal2` Enforcement via `AS RESTRICTIVE` Policies:** Every CMS table blocks draft `SELECT`, `INSERT`, `UPDATE`, and `DELETE` unless `(select auth.jwt()->>'aal') = 'aal2'`. Even a valid password-authenticated `aal1` session cannot read drafts or mutate data directly via PostgREST.
- **Scoped `SECURITY DEFINER` Functions:** `public.current_admin_role()` and `public.can_approve_financial()` pin `SET search_path = public`, revoke `PUBLIC` execution, grant `EXECUTE` only to `authenticated`, and verify `ar.is_active = true` against `admin_roles`.
- **Financial Segregation in SQL:** `registration_fees` enforces `public.current_admin_role() = 'super_admin' OR (public.current_admin_role() = 'content_admin' AND (status = 'draft' OR public.can_approve_financial()))` on `INSERT`/`UPDATE`/`DELETE`.
- **`people` PII/Draft Isolation:** Public `SELECT` on `people` uses `EXISTS` against published/archived `speakers` or `committee_members`, blocking exposure of unlinked/draft speaker profiles.
- **Append-Only Audit & Versioning:** `audit_logs` and `content_versions` define `SELECT` and `INSERT` (`actor_id = auth.uid()` / `created_by = auth.uid()`) policies only — zero `UPDATE` or `DELETE` policies for any authenticated JWT.
- **Database Integrity Constraints:** Unique partial index `conference_editions_single_active_idx` (`WHERE is_active = true`), `end_date >= start_date`, positive sort/fee checks, and `ON DELETE CASCADE` on edition-owned tables.

---

## 2. Findings & Hardening Items

### RLS-01 [Low — Confirmed]: `public.set_updated_at()` Lacks Explicit `SET search_path`
- **Affected File:** [`supabase/migrations/0001_core_editions_and_cms.sql`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/supabase/migrations/0001_core_editions_and_cms.sql#L24-L32)
- **Evidence:** `CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ ...` omits `SET search_path = public` (or `''`). Supabase Database Linter (`0011_function_search_path_mutable`) flags functions without fixed `search_path`.
- **Recommended Fix:** Add `SET search_path = public` to `public.set_updated_at()`.
- **Verification Criteria:** Run `supabase db lint` after migration update and confirm `function_search_path_mutable` reports 0 issues.

### RLS-02 [Low — Confirmed]: Storage RLS Allows `INSERT`/`UPDATE` When `metadata` Is `NULL` (Direct API Extension Risk)
- **Affected File:** [`supabase/migrations/0004_storage_buckets_and_policies.sql`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/supabase/migrations/0004_storage_buckets_and_policies.sql#L72-L89)
- **Evidence:** `conference_storage_admin_insert` tolerates `metadata IS NULL OR metadata->>'mimetype' IS NULL` for TUS compatibility and explicitly blocks only `btrim(name) !~* '\.(svg|html?|xhtml)$'` instead of requiring a positive extension regex `\.(png|jpe?g|webp|pdf)$`. Bucket-level `allowed_mime_types` protects HTTP uploads via Content-Type, but an authenticated `aal2` user uploading directly to Storage could supply an arbitrary filename extension (e.g., `.txt` or `.js`) with `image/png` Content-Type.
- **Recommended Fix:** Replace the negative extension regex in `0004_storage_buckets_and_policies.sql` with a positive allowlist regex: `AND btrim(name) ~* '^[0-9]{4}/[a-zA-Z0-9._-]+\.(png|jpe?g|webp|pdf)$'`.
- **Verification Criteria:** Live storage upload tests confirm `.svg`, `.html`, `.js`, and path-traversal object keys are rejected by PostgreSQL RLS even when called directly via Supabase JS client.

---

## 3. Untested Database & Recovery Areas (Supabase Not Configured)

- **Live `supabase db push` / Migration Execution:** `supabase` CLI and Docker Postgres were not running; SQL syntax and RLS behavior were tested via static pattern checks (`tests/integration/rls-policies.test.ts` and `schema-seed.test.ts`), **NOT** executed against live PostgreSQL 15.
- **pgTAP Policy Proof Suite:** No `pgTAP` database test suite exists or ran against real `anon`, `authenticated (aal1)`, `editor`, `content_admin`, and `super_admin` JWT claims.
- **Point-in-Time Recovery (PITR) & Backup Restore Drills:** Backup schedule, snapshot retention, and restore procedures have not been configured or drilled yet.
