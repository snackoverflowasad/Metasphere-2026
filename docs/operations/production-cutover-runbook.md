# MetaSphere 2027 Production Cutover Runbook

This runbook documents how to connect the Next.js application to a live Supabase project, bootstrap the first `super_admin`, deploy to Vercel, and cut over production traffic from the legacy static MetaSphere 2026 site.

## 1. Pre-Cutover Baseline & Rollback Reference

- The pre-migration static HTML/CSS/JS site is preserved in Git tag `legacy-2026-static`.
- A structured snapshot of all 13 legacy pages, 22 local asset paths, 36 Cloudinary URLs, theme hex tokens, and MetaSphere 2026 structured content is preserved in `docs/migration/legacy-inventory.json`.
- Before connecting Supabase, public routes serve the built-in fallback snapshot (`src/lib/fallback/seed-snapshot.ts`) automatically, and `/admin/*` redirects unauthenticated requests to `/admin/login`.

## 2. Supabase Project Provisioning

1. Create a new Supabase project in the target organization/region.
2. Disable public self-sign-ups in **Authentication -> Sign In / Providers -> Email** (admin accounts are invite-only via `SUPABASE_SECRET_KEY`).
3. Enable **TOTP Multi-Factor Authentication (MFA)** in **Authentication -> Multi-Factor**.
4. Apply the SQL migrations in order (`supabase/migrations/`):
   - `0001_core_editions_and_cms.sql`
   - `0002_admin_rbac_and_audit.sql`
   - `0003_rls_policies_and_aal2.sql`
   - `0004_storage_buckets_and_policies.sql`
   Using the Supabase CLI after linking (`npx supabase link --project-ref <project-ref>`):
   ```bash
   npx supabase db push
   ```
5. Seed initial `2026` (archived) and `2027` (active) edition data from `supabase/seed.sql` if not loaded automatically during setup.

## 3. Environment Variables

Configure these variables in `.env.local` (local dev) and Vercel Project Settings (Production & Preview):

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (`https://<project-ref>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable/anon API key
- `SUPABASE_SECRET_KEY`: Server-only Supabase secret/service-role key (never expose with `NEXT_PUBLIC_`)

## 4. Bootstrap the First `super_admin`

Because `/admin` enforces invite-only auth plus `aal2` MFA:

1. In Supabase Dashboard (**Authentication -> Users -> Invite user**), invite the primary organizing chair's email address.
2. Insert a matching row in `public.admin_roles`:
   ```sql
   INSERT INTO public.admin_roles (user_id, email, display_name, role, can_approve_financial, is_active)
   VALUES ('<auth-user-uuid>', '<chair-email>', '<Full Name>', 'super_admin', true, true);
   ```
3. The chair accepts the invite email, signs in at `/admin/login`, and completes TOTP authenticator enrollment at `/admin/mfa`.
4. Additional organizing committee members can then be invited directly from `/admin/users` with scoped roles (`super_admin`, `content_admin`, `editor`).
   - Financial bank/UPI and fee edits on `/admin/registration` require `super_admin` or `content_admin` with `can_approve_financial = true`.

## 5. Vercel Deployment & DNS Cutover

1. Import the GitHub repository into Vercel (Framework Preset: **Next.js**).
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` to Vercel Environment Variables.
3. Verify the Preview Deployment:
   - Homepage (`/`) shows **MetaSphere 2027** with `#fffbf5` theme, countdown, tracks modal, and Cloudinary media.
   - Archived edition (`/2026`) shows the 2026 archive banner and 21–22 August 2026 content.
   - Legacy URLs (`/CallPapers.html`, `/registration.html`, `/Keynote_Speaker.html`, etc.) return `308` permanent redirects to canonical Next.js routes.
   - `/admin/overview` redirects unauthenticated requests to `/admin/login`.
   - `/sitemap.xml` and `/robots.txt` return HTTP `200`.
4. Point the production domain (`metasphere2027.iem.edu.in` / `metasphere2026.iem.edu.in` as configured) to Vercel.
5. Verify Google Search Console and re-submit `/sitemap.xml`.

## 6. Post-Cutover Verification

Run the full verification suite cleanly before tagging a release:

```bash
npx tsc --noEmit
npx vitest run
npm run build
npx playwright test
```
