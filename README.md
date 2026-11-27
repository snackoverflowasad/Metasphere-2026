# MetaSphere 2027

Official multi-edition conference platform for **MetaSphere: The International Conference on Cloud Computing, Virtualization, and the Metaverse**, organized by the Department of Computer Application (BCA) & IEM Centre of Excellence at the Institute of Engineering & Management (IEM), Kolkata, India.

## Architecture

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4 (preserving the `#fffbf5` warm cream ground, `#f97316`/`#ea580c` primary actions, `#d946ef` accents, Cloudinary media, and local `public/Assets/`)
- **Backend & CMS:** Supabase (PostgreSQL, Invite-Only Auth + TOTP MFA `aal2`, Row Level Security, Storage buckets) with automatic typed fallback data when Supabase environment variables are not yet configured
- **Editions:** Multi-edition support with **MetaSphere 2027** as the active edition (`/`) and **MetaSphere 2026** preserved as an archived edition (`/2026`)
- **Testing & CI:** Vitest unit/integration suite, Playwright E2E suite (Chromium), and GitHub Actions CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))

## Key Routes

- `/` — Active edition (**MetaSphere 2027**) homepage
- `/call-for-papers`, `/paper-submission`, `/registration`, `/speakers`, `/technical-programs`, `/sponsors`, `/contact`
- `/committees/advisory`, `/committees/scientific`, `/committees/technical`, `/committees/aaia`
- `/2026` and `/2026/*` — Archived **MetaSphere 2026** edition
- `/admin` — Invite-only, TOTP MFA-protected conference CMS (`/admin/login`, `/admin/mfa`, `/admin/overview`, settings, deadlines, speakers, committees, tracks, programme, sponsors, registration, users, activity)
- Legacy `*.html` URLs (e.g., `/CallPapers.html`, `/registration.html`) automatically return permanent redirects to their canonical Next.js routes.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and configure Supabase keys when ready (optional for local public-site preview, which uses the built-in seed snapshot):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   SUPABASE_SECRET_KEY=
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Verification Commands

```bash
npx tsc --noEmit
npx vitest run
npm run build
npx playwright test
```

## Production Cutover & Supabase Setup

See [`docs/operations/production-cutover-runbook.md`](docs/operations/production-cutover-runbook.md) for database migrations, Storage bucket setup, invite-only Super Admin bootstrapping, MFA enrollment, and Vercel deployment steps. The frozen pre-migration static site is tagged as `legacy-2026-static`.
