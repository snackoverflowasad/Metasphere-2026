# Supabase Project Handoff & Connection Guide

This guide explains how to connect the MetaSphere Conference Platform (`2026` archived + `2027` active editions) to your institutional or collaborator Supabase project when you are ready to provision the live database.

> **Important:** All schema migrations (`0001`–`0004`) and seed data (`supabase/seed.sql`) are already prepared in this repository. Follow the steps below in order to wire up a fresh Supabase project cleanly.

---

## 1. Prerequisites

- A Supabase account (ideally under an **IEM institutional organization** rather than a personal student account).
- Node.js 20+ and npm installed locally.
- Supabase CLI available via `npx supabase --version` (or globally installed).

---

## 2. Create the Supabase Project

1. Sign in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New project**.
3. Choose the **Organization**, enter a project name (e.g., `metasphere-platform`), set a strong database password (save it in a password manager), and select the **Mumbai (`ap-south-1`)** region for lowest latency to IEM Kolkata (`Asia/Kolkata`).
4. Wait 1–2 minutes for PostgreSQL, Auth, and Storage to finish provisioning.

---

## 3. Configure `.env.local` (Modern Supabase Keys)

In the Supabase Dashboard, open **Project Settings → API Keys**.

Create a `.env.local` file at the repository root (copy from `.env.example`) using **only** the modern key names:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

### Security Rules for Keys
- **Use modern keys:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) for browser/SSR client usage and `SUPABASE_SECRET_KEY` (`sb_secret_...`) for server-only administrative actions.
- **Never** expose `SUPABASE_SECRET_KEY` in client components or prefix it with `NEXT_PUBLIC_`.
- **Never** commit `.env.local` to Git.
- When deploying to Vercel later, add the same three variables in **Vercel Project → Settings → Environment Variables** (marking `SUPABASE_SECRET_KEY` as server-only / sensitive).

---

## 4. Configure Invite-Only Auth & TOTP MFA in Dashboard

Mirror the local `supabase/config.toml` security posture in the hosted Supabase Dashboard:

1. Go to **Authentication → Providers → Email**:
   - Confirm **Email** provider is enabled.
   - Turn **OFF** public signups (**Authentication → Sign In / Providers → Allow new users to sign up** = disabled) so admin access is strictly invite-only.
   - Keep **Anonymous sign-ins** disabled.
2. Go to **Authentication → Multi-Factor Authentication (MFA)**:
   - Enable **TOTP (App Authenticator)** for both **enrollment** and **verification**.
   - PostgreSQL RLS policies in `0003_rls_policies_and_aal2.sql` enforce `(select auth.jwt()->>'aal') = 'aal2'` on all draft reads and all writes. Without TOTP MFA, an authenticated user stays at `aal1` and cannot read drafts or modify CMS data.
3. Go to **Authentication → URL Configuration**:
   - Set **Site URL** to your production domain (or `http://localhost:3000` during local testing).
   - Add redirect URLs for local dev and preview deployments (e.g. `http://localhost:3000/**`, `https://<your-domain>/**`).

---

## 5. Link Project & Push Migrations (`0001`–`0004`)

From the repository root:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

`npx supabase db push` applies all four migrations in order:
1. `0001_core_editions_and_cms.sql` — 13 conference/CMS tables (`conference_editions`, `site_settings`, `deadlines`, `tracks`, `people`, `speakers`, `committees`, `committee_members`, `sponsors`, `program_sessions`, `resources`, `conference_links`, `registration_fees`) with `Asia/Kolkata` defaults and `INR`/`USD` fee columns.
2. `0002_admin_rbac_and_audit.sql` — `admin_roles`, immutable `audit_logs`, and `content_versions`.
3. `0003_rls_policies_and_aal2.sql` — enables RLS on all 16 tables, creates `public.current_admin_role()` and `public.can_approve_financial()`, enforces `aal2` MFA via `AS RESTRICTIVE` policies, and enforces the `editor` / `content_admin` / `super_admin` RBAC matrix.
4. `0004_storage_buckets_and_policies.sql` — creates `conference-public` (public read) and `conference-private` (private `aal2` admin read) with a 10 MB limit and MIME allowlist (`image/png`, `image/jpeg`, `image/webp`, `application/pdf`; blocking `image/svg+xml` and `text/html`).

---

## 6. Seed 2026 (Archived) & 2027 (Active) Editions

Run `supabase/seed.sql` against your linked project using either:

- **Option A — Supabase Dashboard SQL Editor:**
  1. Open **SQL Editor → New query** in the Supabase Dashboard.
  2. Paste the contents of `supabase/seed.sql` and click **Run**.
- **Option B — `psql` CLI (using the Session/Direct Postgres connection string from Project Settings → Database):**
  ```bash
  psql "<SUPABASE_DB_URL>" -f supabase/seed.sql
  ```

`supabase/seed.sql` is idempotent and populates both the **2026** (`status = 'archived'`, `is_active = false`) and **2027** (`status = 'published'`, `is_active = true`) editions with all preserved Cloudinary URLs, local `Assets/` paths, speakers, committees, tracks, deadlines, sponsors, and registration fees.

---

## 7. Create the First `super_admin` & Enroll TOTP MFA

Because public self-signup is disabled, invite your first Super Admin from the Supabase Dashboard:

1. Go to **Authentication → Users → Invite user** (or **Add user → Create new user** with a temporary password).
2. Enter the faculty coordinator's institutional email address.
3. Copy the created user's **User UID** (`uuid`) from the **Authentication → Users** table.
4. Open **SQL Editor** and run:

```sql
INSERT INTO public.admin_roles (
  user_id,
  email,
  display_name,
  role,
  can_approve_financial,
  is_active
)
VALUES (
  '<USER_UUID_FROM_AUTH_USERS>',
  '<faculty-coordinator@iem.edu.in>',
  'Conference Chair',
  'super_admin',
  true,
  true
)
ON CONFLICT (user_id) DO UPDATE
SET
  role = EXCLUDED.role,
  can_approve_financial = EXCLUDED.can_approve_financial,
  is_active = EXCLUDED.is_active;
```

5. Have the Super Admin sign in at `/admin/login`:
   - On first login, their session is at `aal1`.
   - They will be redirected to `/admin/mfa` to scan a QR code with an authenticator app (Google Authenticator, 1Password, Microsoft Authenticator, or Authy) and verify the 6-digit TOTP code.
   - Once verified, Supabase issues an `aal2` JWT, unlocking CMS reads/writes and user management in `/admin/users`.

---

## 8. Post-Connection Verification Checklist

- [ ] **Table RLS check:** In **Database → Tables**, confirm all 16 `public` tables show **RLS enabled**.
- [ ] **Storage check:** In **Storage → Buckets**, confirm `conference-public` (public) and `conference-private` (private) exist with `10 MB` limit and `image/png, image/jpeg, image/webp, application/pdf` allowed MIME types.
- [ ] **Seed check:** Confirm `conference_editions` has both `2026` (`archived`, `is_active = false`) and `2027` (`published`, `is_active = true`).
- [ ] **Auth & MFA check:** Confirm logging in without TOTP verification (`aal1`) cannot read `draft` rows or write to CMS tables, and completing TOTP verification (`aal2`) unlocks `/admin`.
- [ ] **Automated test suite:** Run `npx vitest run` to verify schema, seed, fallback, and RLS policy assertions pass locally.
