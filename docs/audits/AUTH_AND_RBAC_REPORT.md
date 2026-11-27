# Authentication & RBAC Security Report — MetaSphere 2027

**Date:** 2026-11-27  
**Scope:** [`src/proxy.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/proxy.ts), [`src/lib/auth/session.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/auth/session.ts), [`src/lib/permissions/rbac.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/permissions/rbac.ts), [`src/app/admin/login/LoginForm.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/admin/login/LoginForm.tsx), [`src/app/admin/mfa/MfaFlow.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/admin/mfa/MfaFlow.tsx), [`src/features/admin-users/actions.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/features/admin-users/actions.ts), [`src/features/registration/actions.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/features/registration/actions.ts), [`supabase/config.toml`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/supabase/config.toml)

---

## 1. Verified Security Controls

- **Fail-Closed Request Proxy (`src/proxy.ts`):** Intercepts all `/admin/:path*` routes. When Supabase is unconfigured, redirects every `/admin/*` route except `/admin/login` to `/admin/login` (`307` verified at runtime for `/admin/overview`, `/admin/users`, `/admin/registration`, `/admin/mfa`). When configured, verifies JWT claims via `supabase.auth.getClaims()` and redirects `aal !== 'aal2'` sessions to `/admin/mfa`.
- **Three-Layer `aal2` MFA & RBAC Guard:** Admin access requires passing `src/proxy.ts`, `requireAdminSession()` in Server Components/Server Actions (`src/lib/auth/session.ts`), and PostgreSQL RLS `AS RESTRICTIVE` policies (`auth.jwt()->>'aal' = 'aal2'`).
- **Invite-Only Login Surface (`LoginForm.tsx`):** Contains password sign-in only — zero self-registration UI, zero OAuth public sign-up buttons. `supabase/config.toml` sets `enable_signup = false` and `enable_anonymous_sign_ins = false`.
- **Self-Lockout Guard (`admin-users/actions.ts`):** `updateAdminRoleAction` and `deactivateAdminUserAction` explicitly block the signed-in `super_admin` from demoting or deactivating their own account.
- **No Trust in Client `user_metadata`:** While `inviteUserByEmail` writes metadata hints, `requireAdminSession()` and SQL `current_admin_role()` authorize solely from `public.admin_roles` (`is_active = true`).

---

## 2. Findings & Hardening Gaps

### AUTH-01 [Medium — Confirmed]: Deactivated / Demoted Admin Sessions Are Not Revoked Immediately
- **Affected File:** [`src/features/admin-users/actions.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/features/admin-users/actions.ts#L98-L201)
- **Evidence:** `updateAdminRoleAction` and `deactivateAdminUserAction` set `admin_roles.is_active = false` or lower the user's `role`, but never invalidate active Supabase Auth sessions (e.g., `adminSupabase.auth.admin.signOut(data.userId)`). Because `supabase/config.toml` specifies `jwt_expiry = 3600`, a deactivated user's existing JWT remains `aal2`-valid in `src/proxy.ts` (though DB queries/writes are blocked by `requireAdminSession` checking `admin_roles.is_active = true` and RLS calling `current_admin_role()`).
- **Recommended Fix:** Invoke `await adminSupabase.auth.admin.signOut(data.userId)` whenever `isActive` becomes `false` or a role is downgraded, and record the prior `beforeRow` snapshot in `audit_logs.before_data` (currently `before_data: null` at line 144).
- **Verification Criteria:** Integration test confirms `signOut` is called on deactivation/demotion and audit log captures `before_data`.

### AUTH-02 [Low — Confirmed]: `checkStatusPermission` Incomplete on Downgrading Published Financial Records
- **Affected Files:** [`src/lib/cms/mutations.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/cms/mutations.ts#L65-L92), [`src/features/registration/actions.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/features/registration/actions.ts#L62-L94)
- **Evidence:** `checkStatusPermission` enforces `publish_financial` only when `nextStatus === "published"` or `nextStatus === "archived"`. If a `content_admin` *without* `canApproveFinancial: true` calls `upsertRegistrationFeeAction(feeId, { ..., status: "draft" })` on an already `published` fee row, `checkStatusPermission` returns `null`. PostgreSQL RLS (`registration_fees_admin_update` in `0003_rls_policies_and_aal2.sql` line 1096: `status = 'draft' OR public.can_approve_financial()`) **blocks** the SQL `UPDATE`, so no bypass occurs, but the app-layer guard yields a raw PostgreSQL RLS error rather than a clean authorization message.
- **Recommended Fix:** Also enforce `canPerform(actor.role, "publish_financial", ...)` in `checkStatusPermission` when `table === "registration_fees"` and `currentStatus && currentStatus !== "draft"`.
- **Verification Criteria:** Unit test in `tests/unit/upload-and-financial-approval.test.ts` confirms a non-financial `content_admin` cannot revert a published fee row to `draft`.

### AUTH-03 [Low — Confirmed]: Production Cutover Runbook Schema & Role Names Out of Sync With Codebase
- **Affected File:** [`docs/operations/production-cutover-runbook.md`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/docs/operations/production-cutover-runbook.md)
- **Evidence:** The runbook instructs operators to insert into `public.admin_users (user_id, email, full_name, role, is_active)` and lists role names `program_chair` and `registration_treasurer`. In the actual schema (`0002_admin_rbac_and_audit.sql`), the table is `public.admin_roles (user_id, email, display_name, role, can_approve_financial, is_active)` and the enum values are `'super_admin'`, `'content_admin'`, `'editor'`.
- **Recommended Fix:** Update `production-cutover-runbook.md` to reference `public.admin_roles`, `display_name`, `can_approve_financial`, and the exact enum values. Also align UI mentions of `docs/operations/supabase-handoff.md` vs `production-cutover-runbook.md`.
- **Verification Criteria:** SQL bootstrap snippet executes cleanly against PostgreSQL schema `0002_admin_rbac_and_audit.sql`.

---

## 3. Untested Areas

- **Live Password Sign-In & TOTP Enrollment/Challenge Flow (`LoginForm.tsx`, `MfaFlow.tsx`):** Not tested against live Supabase Auth.
- **Brute-Force / Auth Rate Limiting:** Depends on hosted Supabase Auth rate-limit configuration; not testable offline.
- **Privilege Escalation Matrix:** Cross-role testing (`editor`, `content_admin`, `super_admin`) was unit-tested via mocked roles (`validation-and-rbac.test.ts`), not against live multi-user JWT cookies.
