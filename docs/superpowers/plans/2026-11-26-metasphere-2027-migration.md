# MetaSphere 2027 Migration & Conference Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the 13-page static MetaSphere HTML/JS website into a reusable, multi-edition Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase conference management platform (with MetaSphere 2026 archived and MetaSphere 2027 active), backed by an invite-only, TOTP MFA-protected admin CMS, while preserving the exact visual theme, colors, local images, and `res.cloudinary.com` media links.

**Architecture:** A modular Next.js 16 App Router application separated into `(public)` edition-aware Server Component pages, a `/2026` archive namespace, and an `/admin` CMS protected by `@supabase/ssr` cookie sessions, Next.js 16 `proxy.ts`, mandatory TOTP MFA (`aal2`), RBAC (`super_admin`, `content_admin`, `editor`, plus financial approval), and PostgreSQL Row Level Security (RLS). Every CMS record supports `draft` → `preview` → `published` (and `archived`) states, server-side Zod validation, immutable `audit_logs`, and on-demand Next.js cache invalidation via `revalidateTag(tag, { expire: 0 })`.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), TypeScript, Tailwind CSS 4, shadcn/ui + Radix UI, React Hook Form, Zod, Lucide React, Supabase (`@supabase/supabase-js`, `@supabase/ssr`, Supabase CLI, PostgreSQL + RLS + Auth MFA + Storage), Vitest, Playwright, Vercel, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-26-metasphere-2027-design.md` (written from the user-provided migration & architecture specification + visual/media preservation constraint).

---

## Global Constraints

- **Visual & Media Preservation (Strict):** Do NOT change the existing website theme, color palette (`#fffbf5` page background, `#1a202c` primary text, `#f97316` / `#ea580c` orange accents, `linear-gradient(45deg, #f97316, #d946ef)` gradient text, `#fef3c7` / `#f3eadd` warm highlights), `Inter` font family, layout structure, local assets in `Assets/`, or any of the existing `https://res.cloudinary.com/dh87hfwml/...` image and video URLs. Seed all existing Cloudinary URLs and `Assets/` paths verbatim into the database/CMS. Use Supabase Storage only for *newly* uploaded admin assets.
- **Edition Separation:** Preserve MetaSphere 2026 (`21–22 August 2026`) as an archived edition (`status = 'archived'`, accessible under `/2026/...`) and create MetaSphere 2027 (`17–18 August 2027` tentative, `status = 'published'`, `is_active = true`) as the primary edition. Never overwrite 2026 records in place.
- **External Integrations Kept:** Paper submission remains on Microsoft CMT and registration remains on Microsoft Forms + institutional bank/UPI instructions; manage their URLs and instructions through the CMS rather than building custom peer-review or payment gateways.
- **Supabase Key Standard:** Use `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SECRET_KEY` (never `NEXT_PUBLIC_SUPABASE_SECRET_KEY`, and do not rely on deprecated `anon`/`service_role` names).
- **Next.js 16 Conventions:** Use `src/proxy.ts` exporting `proxy(request)` (not `middleware.ts`), and pass a `cacheLife` profile (e.g., `{ expire: 0 }` for immediate publish updates or `'max'`) as the second argument to `revalidateTag(tag, profile)`.
- **Timezone & Currency Clarity:** Store dates/deadlines as `timestamptz`, store edition timezone as `'Asia/Kolkata'`, always display `IST (UTC+5:30)` explicitly on public dates/deadlines (with optional viewer-local time enhancement), and store separate `INR` and `USD` registration fees.
- **Security Floor:** Invite-only admin auth (no public signup), mandatory TOTP MFA (`aal2` enforced in PostgreSQL RLS), RLS enabled on every exposed table, independent auth/RBAC checks inside every Server Action and Route Handler, Zod validation (`http://`/`https://` URLs only), no SVG uploads in admin storage, and institutional account ownership (no personal-only credentials).

## Review Focus

1. **Pre-MFA (`aal1`) bypass on admin mutations:** An invited admin logs in with email/password (`aal1`) and calls a Server Action, `/api/admin/...` route, or Supabase REST endpoint directly before completing TOTP verification (`aal2`). Expected: rejected with `401/403` by both server guard (`requireAdminSession({ minAal: 'aal2' })`) and PostgreSQL `AS RESTRICTIVE` RLS policy `(select auth.jwt()->>'aal') = 'aal2'`.
2. **Role privilege escalation & unapproved financial edits:** An `editor` or `content_admin` tries to update `admin_roles`, publish content without `content_admin`/`super_admin` role, or publish `registration_fees`/bank/UPI instructions without `can_approve_financial` / `super_admin` approval. Expected: blocked at both Zod/RBAC handler and PostgreSQL RLS `WITH CHECK`, and logged only on authorized changes.
3. **Unsafe URLs & malicious file uploads:** An admin enters `javascript:alert(1)` or `data:text/html,...` into Microsoft CMT/Forms URL fields or uploads an `.svg`/`.html` file to Supabase Storage. Expected: rejected by `safeHttpUrlSchema` (`https:`/`http:` protocol check) and Storage bucket MIME allowlist (`image/png`, `image/jpeg`, `image/webp`, `application/pdf`).
4. **Timezone & countdown drift for international visitors:** Hardcoded browser-local `new Date("2027-08-17T09:00:00")` shifts countdown and deadlines for non-IST visitors. Expected: ISO timestamps include `+05:30` / `Asia/Kolkata` timezone metadata, public UI labels `IST (UTC+5:30)`, and optional client-side local equivalent never mutates canonical IST values.
5. **Broken legacy `.html` URLs or altered Cloudinary/theme assets:** Existing bookmarks/search links to `/CallPapers.html`, `/Keynote_Speaker.html`, `/PaperSubmit.html`, etc. 404 after migration, or Next `<Image>`/CSS changes break existing Cloudinary videos/images or `#fffbf5` / `#f97316` styling. Expected: permanent 308/301 redirects in `next.config.ts` for all 13 legacy `.html` routes, `res.cloudinary.com` remote pattern configured, and Playwright visual/DOM assertions confirm exact theme tokens and `res.cloudinary.com/dh87hfwml` URLs render.

---

## Repository Target Structure

```text
Project-IEM/
├── public/
│   ├── Assets/                 # Existing local assets preserved verbatim (banner SVG, speaker photos, templates)
│   ├── favicon.ico
│   └── favicon.svg
├── src/
│   ├── proxy.ts                # Next.js 16 session refresh + /admin auth/AAL2 redirect guard
│   ├── app/
│   │   ├── layout.tsx          # Inter font, #fffbf5 body background, metadata base
│   │   ├── globals.css         # Tailwind CSS 4 + exact MetaSphere CSS variables & gradient/loader utilities
│   │   ├── not-found.tsx       # Migrated 404.html preserving exact theme
│   │   ├── sitemap.ts          # Dynamic XML sitemap from published editions/routes
│   │   ├── robots.ts           # Dynamic robots.txt
│   │   ├── (public)/
│   │   │   ├── layout.tsx      # Public Header (Banner + Nav) & Footer bound to active edition
│   │   │   ├── page.tsx                    # index.html
│   │   │   ├── call-for-papers/page.tsx    # CallPapers.html
│   │   │   ├── paper-submission/page.tsx   # PaperSubmit.html
│   │   │   ├── registration/page.tsx       # registration.html
│   │   │   ├── speakers/page.tsx           # Keynote_Speaker.html
│   │   │   ├── technical-programs/page.tsx # technical-programs.html
│   │   │   ├── sponsors/page.tsx           # TechSponsor.html
│   │   │   ├── contact/page.tsx            # Contact.html
│   │   │   └── committees/
│   │   │       ├── advisory/page.tsx       # AdvisoryCommittee.html
│   │   │       ├── scientific/page.tsx     # scientific-committee.html
│   │   │       ├── technical/page.tsx      # TechCommittee.html
│   │   │       └── aaia/page.tsx           # AAIA.html
│   │   ├── 2026/                           # Archived MetaSphere 2026 read-only edition views
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx                  # Admin sidebar/header (verifies session + aal2 + role)
│   │   │   ├── login/page.tsx              # Email + password sign-in
│   │   │   ├── mfa/page.tsx                # Mandatory TOTP enrollment / challenge
│   │   │   ├── overview/page.tsx           # Edition KPIs, drafts pending approval, upcoming deadlines
│   │   │   ├── event-settings/page.tsx     # Edition title, dates, timezone, venue, format
│   │   │   ├── deadlines/page.tsx          # CRUD + Draft/Publish for deadlines
│   │   │   ├── speakers/page.tsx           # People + Keynote Speakers CRUD
│   │   │   ├── committees/page.tsx         # Committee categories + member assignments
│   │   │   ├── tracks/page.tsx             # Research tracks & CFP topics
│   │   │   ├── programme/page.tsx          # Day-by-day sessions CRUD
│   │   │   ├── sponsors/page.tsx           # Technical sponsors CRUD
│   │   │   ├── registration/page.tsx       # INR/USD fees + financial-approval gated instructions
│   │   │   ├── resources/page.tsx          # External links (CMT, Forms) & safe file uploads
│   │   │   ├── users/page.tsx              # Super Admin invite & role/financial-approver management
│   │   │   └── activity/page.tsx           # Read-only audit_logs & content_versions viewer
│   │   └── api/
│   │       ├── health/route.ts
│   │       └── preview/route.ts            # Authenticated draft preview token cookie handler
│   ├── components/
│   │   ├── ui/                             # shadcn/ui primitives (admin only; public keeps legacy look)
│   │   ├── layout/                         # PublicHeader.tsx, PublicFooter.tsx, EditionBanner.tsx
│   │   ├── home/                           # CountdownTimer.tsx, CloudinaryVideoBg.tsx, Carousels.tsx, TrackModal.tsx
│   │   ├── speakers/                       # SpeakerGrid.tsx
│   │   ├── committees/                     # CommitteeDirectory.tsx
│   │   ├── deadlines/                      # DeadlinesSection.tsx
│   │   └── programme/                      # ProgrammeSchedule.tsx
│   ├── features/                           # Domain queries, Server Actions & Zod schemas per module
│   │   ├── conference/
│   │   ├── deadlines/
│   │   ├── people/
│   │   ├── programme/
│   │   ├── registration/
│   │   ├── resources/
│   │   └── admin-users/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                   # createBrowserClient (publishable key)
│   │   │   ├── server.ts                   # createServerClient (@supabase/ssr + cookies)
│   │   │   └── admin.ts                    # Server-only secret key client (invites/audit, never imported in client)
│   │   ├── auth/session.ts                 # getAdminContext(), requireAdminSession()
│   │   ├── permissions/rbac.ts             # Role matrix + financial approval check
│   │   ├── validation/common.ts            # safeHttpUrlSchema, uploadMimeSchema, editionSlugSchema
│   │   ├── security/headers.ts             # CSP & security headers helper
│   │   └── dates/ist.ts                    # Asia/Kolkata formatting & countdown calculation
│   └── types/database.ts                   # Generated Supabase TypeScript types
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_core_editions_and_cms.sql
│   │   ├── 0002_admin_rbac_and_audit.sql
│   │   ├── 0003_rls_policies_and_aal2.sql
│   │   └── 0004_storage_buckets_and_policies.sql
│   └── seed.sql                            # MetaSphere 2026 (archived) + MetaSphere 2027 (active) + exact Cloudinary URLs
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .github/workflows/ci.yml
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Phase 1: Repository Cleanup, Content Inventory & Preservation Manifest

### Task 1: Audit Legacy HTML Pages and Lock Preservation Manifest

**Files:**
- Create: `docs/migration/legacy-inventory.json`
- Create: `tests/unit/preservation-manifest.test.ts`

**Interfaces:**
- Produces: `docs/migration/legacy-inventory.json` containing `{ legacyRedirects: Array<{ source: string; destination: string }>, cloudinaryUrls: string[], localAssets: string[], externalLinks: Record<string, string>, themeTokens: { background: '#fffbf5', foreground: '#1a202c', primary: '#f97316', primaryHover: '#ea580c', accentMagenta: '#d946ef' } }`.

- [ ] **Step 1: Create branch and preserve legacy snapshot reference**

Run: `git checkout -b feat/metasphere-2027-platform && git tag legacy-2026-static`
Expected: New feature branch created and static 2026 state tagged for reference.

- [ ] **Step 2: Write the failing manifest verification test**

```ts
// tests/unit/preservation-manifest.test.ts
import { describe, expect, it } from 'vitest';
import inventory from '../../docs/migration/legacy-inventory.json';

describe('legacy preservation manifest', () => {
  it('captures all 13 legacy HTML redirects, Cloudinary media URLs, and theme tokens', () => {
    expect(inventory.legacyRedirects).toHaveLength(13);
    expect(inventory.cloudinaryUrls.length).toBeGreaterThanOrEqual(30);
    expect(inventory.cloudinaryUrls.every((u: string) => u.startsWith('https://res.cloudinary.com/dh87hfwml/'))).toBe(true);
    expect(inventory.themeTokens).toEqual({
      background: '#fffbf5',
      foreground: '#1a202c',
      primary: '#f97316',
      primaryHover: '#ea580c',
      accentMagenta: '#d946ef',
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/preservation-manifest.test.ts`
Expected: FAIL because `docs/migration/legacy-inventory.json` and Vitest config do not exist yet.

- [ ] **Step 4: Extract structured 2026 content, all 13 HTML route mappings, and every Cloudinary/local asset URL into `docs/migration/legacy-inventory.json`**

Include exact mappings from `index.html` → `/`, `CallPapers.html` → `/call-for-papers`, `PaperSubmit.html` → `/paper-submission`, `registration.html` → `/registration`, `Keynote_Speaker.html` → `/speakers`, `technical-programs.html` → `/technical-programs`, `TechSponsor.html` → `/sponsors`, `Contact.html` → `/contact`, `AdvisoryCommittee.html` → `/committees/advisory`, `scientific-committee.html` → `/committees/scientific`, `TechCommittee.html` → `/committees/technical`, `AAIA.html` → `/committees/aaia`, `404.html` → `/404`, plus all `res.cloudinary.com/dh87hfwml/...` URLs and `Assets/...` files, Microsoft CMT link, Microsoft Forms link, Overleaf/Drive links, and all 2026 committee/speaker/fee/deadline records extracted from the 13 HTML files.

- [ ] **Step 5: Run test to verify it passes and commit**

Run: `npx vitest run tests/unit/preservation-manifest.test.ts`
Expected: PASS
```bash
git add docs/migration/legacy-inventory.json tests/unit/preservation-manifest.test.ts
git commit -m "chore: capture legacy 2026 inventory and media preservation manifest"
```

---

## Phase 2: Next.js 16 Foundation & Exact Theme Shell

### Task 2: Initialize Next.js 16 + TypeScript + Tailwind CSS 4 + Exact MetaSphere Theme Shell

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/lib/security/headers.ts`
- Create: `src/components/layout/PublicHeader.tsx`
- Create: `src/components/layout/PublicFooter.tsx`
- Create: `src/app/not-found.tsx`
- Test: `tests/unit/next-config-redirects.test.ts`

**Interfaces:**
- Produces:
  - `legacyHtmlRedirects(): Promise<Redirect[]>` in `next.config.ts`
  - `buildSecurityHeaders(): Array<{ key: string; value: string }>` in `src/lib/security/headers.ts`
  - `PublicHeader(props: { editionYear: number; editionLabel: string; isArchived?: boolean }): JSX.Element`
  - `PublicFooter(props: { editionYear: number; links: ConferenceLinkMap }): JSX.Element`

- [ ] **Step 1: Write the failing test for legacy redirects, Cloudinary image allowlist, and security headers**

```ts
// tests/unit/next-config-redirects.test.ts
import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';
import { buildSecurityHeaders } from '../../src/lib/security/headers';

describe('next.config.ts & security headers', () => {
  it('redirects all 13 legacy .html routes and allows res.cloudinary.com', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects.find((r) => r.source === '/CallPapers.html')?.destination).toBe('/call-for-papers');
    expect(redirects.find((r) => r.source === '/Keynote_Speaker.html')?.destination).toBe('/speakers');
    expect(nextConfig.images?.remotePatterns?.some((p) => p.hostname === 'res.cloudinary.com')).toBe(true);
  });

  it('includes CSP allowing res.cloudinary.com media and blocks framing', () => {
    const headers = buildSecurityHeaders();
    const csp = headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
    expect(csp).toContain('https://res.cloudinary.com');
    expect(headers.find((h) => h.key === 'X-Frame-Options')?.value).toBe('DENY');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/next-config-redirects.test.ts`
Expected: FAIL (`Cannot find module '../../next.config'`)

- [ ] **Step 3: Scaffold Next.js 16 dependencies, config, Tailwind CSS 4 theme tokens, and shared PublicHeader/PublicFooter**

Move `Assets/` into `public/Assets/` (preserving exact filenames so `/Assets/METASPHERE WEBSITE BANNER .svg`, `/Assets/Logo.svg`, `/Assets/keynote-speakers/...` resolve identically), configure `next.config.ts` (308 redirects for all 13 `.html` files, `images.remotePatterns` for `res.cloudinary.com` and `*.supabase.co`, `headers()` calling `buildSecurityHeaders()`), install `next@16`, `react`, `react-dom`, `typescript`, `@tailwindcss/postcss`, `tailwindcss`, `lucide-react`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@supabase/supabase-js`, `@supabase/ssr`, `vitest`, `@playwright/test`, and shadcn/ui primitives (scoped to admin UI). Copy exact `.btn-register`, `.gradient-text`, `#fffbf5` body styles, and header/footer markup/classes into `src/app/globals.css`, `PublicHeader.tsx`, and `PublicFooter.tsx`.

- [ ] **Step 4: Run tests and TypeScript build check**

Run: `npx vitest run tests/unit/next-config-redirects.test.ts && npx tsc --noEmit`
Expected: PASS and 0 TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json next.config.ts vitest.config.ts .env.example public/ src/ tests/unit/next-config-redirects.test.ts
git commit -m "feat: scaffold Next.js 16 foundation preserving MetaSphere theme and legacy assets"
```

---

## Phase 3: Supabase Infrastructure, Schema, RLS & Seed Data

### Task 3: PostgreSQL Multi-Edition Schema & Seed Migration (2026 Archive + 2027 Active)

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/0001_core_editions_and_cms.sql`
- Create: `supabase/migrations/0002_admin_rbac_and_audit.sql`
- Create: `supabase/seed.sql`
- Create: `src/types/database.ts`
- Test: `tests/integration/schema-seed.test.ts`

**Interfaces:**
- Produces SQL tables:
  - `conference_editions` (`id`, `year` unique, `slug`, `title`, `subtitle`, `start_date timestamptz`, `end_date timestamptz`, `timezone text default 'Asia/Kolkata'`, `venue_name`, `venue_address`, `format` `'online'|'offline'|'hybrid'`, `description`, `is_active boolean`, `status` `'draft'|'published'|'archived'`)
  - `site_settings` (`id`, `edition_id`, `canonical_url`, `seo_title`, `seo_description`, `hero_media jsonb`, `status`)
  - `deadlines` (`id`, `edition_id`, `title`, `due_at timestamptz`, `sort_order`, `is_visible`, `status`)
  - `tracks` (`id`, `edition_id`, `code`, `name`, `description`, `topics jsonb`, `image_url`, `sort_order`, `status`)
  - `people` (`id`, `full_name`, `designation`, `institution`, `country`, `photo_url`, `bio`, `social_links jsonb`)
  - `speakers` (`id`, `edition_id`, `person_id`, `speaker_type`, `talk_title`, `sort_order`, `status`)
  - `committees` (`id`, `edition_id`, `slug`, `name`, `category` `'advisory'|'scientific'|'technical'|'aaia'|'organizing'`, `sort_order`, `status`)
  - `committee_members` (`id`, `committee_id`, `person_id`, `role_label`, `nationality_group`, `sort_order`, `status`)
  - `sponsors` (`id`, `edition_id`, `name`, `tier`, `logo_url`, `website_url`, `description`, `sort_order`, `status`)
  - `program_sessions` (`id`, `edition_id`, `track_id`, `speaker_id`, `session_date date`, `starts_at timestamptz`, `ends_at timestamptz`, `title`, `description`, `room_or_link`, `status`)
  - `resources` (`id`, `edition_id`, `label`, `category`, `url`, `storage_path`, `sort_order`, `status`)
  - `conference_links` (`id`, `edition_id`, `key` (`cmt_submission`, `registration_form`, `brochure`, `word_template`, `latex_template`, `schedule`, `instagram`, `linkedin`, `youtube`, etc.), `label`, `url`, `status`)
  - `registration_fees` (`id`, `edition_id`, `category`, `amount_inr integer`, `amount_usd integer`, `tax_note`, `payment_instructions jsonb`, `financial_approved_by uuid`, `financial_approved_at timestamptz`, `sort_order`, `status`)
  - `admin_roles` (`user_id uuid primary key references auth.users`, `role` `'super_admin'|'content_admin'|'editor'`, `can_approve_financial boolean default false`, `is_active boolean default true`)
  - `audit_logs` (`id`, `actor_id`, `actor_role`, `action`, `table_name`, `record_id`, `before_data jsonb`, `after_data jsonb`, `created_at timestamptz default now()`)
  - `content_versions` (`id`, `table_name`, `record_id`, `version_number`, `snapshot jsonb`, `created_by`, `created_at`)

- [ ] **Step 1: Write the failing schema & seed verification test**

```ts
// tests/integration/schema-seed.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('supabase migrations and seed', () => {
  it('defines both 2026 archived and 2027 active editions and preserves Cloudinary URLs', () => {
    const seed = readFileSync('supabase/seed.sql', 'utf8');
    expect(seed).toContain("2026");
    expect(seed).toContain("'archived'");
    expect(seed).toContain("2027");
    expect(seed).toContain("'Asia/Kolkata'");
    expect(seed).toContain('https://res.cloudinary.com/dh87hfwml/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/schema-seed.test.ts`
Expected: FAIL (`ENOENT: no such file or directory, open 'supabase/seed.sql'`)

- [ ] **Step 3: Author SQL migrations (`0001`, `0002`), `seed.sql`, and `src/types/database.ts`**

Create normalized PostgreSQL DDL with `timestamptz`, `publication_status` enum (`'draft' | 'published' | 'archived'`), partial unique index ensuring only one `is_active = true` edition at a time, and `seed.sql` populating `2026` (`archived`, `2026-08-21T09:00:00+05:30` to `2026-08-22T18:00:00+05:30`, all existing speakers/committees/sponsors/Cloudinary URLs) and `2027` (`published`, `is_active = true`, `2027-08-17T09:00:00+05:30` to `2027-08-18T18:00:00+05:30`, default tracks, banner/Cloudinary hero URLs).

- [ ] **Step 4: Apply migrations locally via Supabase CLI and run test**

Run: `npx supabase db reset && npx vitest run tests/integration/schema-seed.test.ts`
Expected: Local Postgres resets cleanly with zero migration/seed errors and Vitest passes.

- [ ] **Step 5: Commit**

```bash
git add supabase/ src/types/database.ts tests/integration/schema-seed.test.ts
git commit -m "feat: add multi-edition PostgreSQL schema, RBAC tables, and 2026/2027 seed"
```

---

### Task 4: Row Level Security (RLS), `aal2` MFA Enforcement & Safe Storage Policies

**Files:**
- Create: `supabase/migrations/0003_rls_policies_and_aal2.sql`
- Create: `supabase/migrations/0004_storage_buckets_and_policies.sql`
- Test: `tests/integration/rls-policies.test.ts`

**Interfaces:**
- Produces PostgreSQL helper functions:
  - `public.current_admin_role() returns text` (`SECURITY DEFINER`, reads `admin_roles` where `user_id = auth.uid() and is_active = true`)
  - `public.can_approve_financial() returns boolean` (`SECURITY DEFINER`)
- Produces Storage buckets:
  - `conference-public` (public read, authenticated `aal2` write for `image/png`, `image/jpeg`, `image/webp`, `application/pdf` — explicitly excludes `image/svg+xml` and `text/html`)
  - `conference-private` (private read/write, authenticated `aal2` only)

- [ ] **Step 1: Write the failing RLS & AAL2 security test**

```ts
// tests/integration/rls-policies.test.ts
// Uses local Supabase test client (anon publishable key + test users at aal1 and aal2)
import { describe, expect, it } from 'vitest';

describe('RLS and MFA enforcement', () => {
  it('allows anon read of published/archived content but blocks draft reads and all writes', async () => { /* asserts drafts hidden, insert returns 401/403 */ });
  it('blocks authenticated editor at aal1 from reading drafts or mutating tables', async () => { /* asserts restrictive aal2 policy rejects aal1 JWT */ });
  it('allows editor at aal2 to insert draft deadlines but blocks publishing or editing admin_roles', async () => { /* asserts status='published' rejected for editor */ });
  it('blocks content_admin without can_approve_financial from publishing registration_fees', async () => { /* asserts financial approval guard */ });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/rls-policies.test.ts`
Expected: FAIL because RLS policies and `current_admin_role()` are not applied yet.

- [ ] **Step 3: Implement `0003_rls_policies_and_aal2.sql` and `0004_storage_buckets_and_policies.sql`**

Enable `ROW LEVEL SECURITY` on all 16 tables; add `AS RESTRICTIVE` policies requiring `(select auth.jwt()->>'aal') = 'aal2'` for all authenticated non-public writes and draft reads; restrict `published` status transitions to `content_admin` / `super_admin`; restrict `admin_roles` management to `super_admin`; require `can_approve_financial()` or `super_admin` to publish `registration_fees`; configure `storage.objects` RLS blocking `image/svg+xml` and `text/html`.

- [ ] **Step 4: Reset local DB and run RLS policy tests**

Run: `npx supabase db reset && npx vitest run tests/integration/rls-policies.test.ts`
Expected: PASS across all unauthorized, `aal1`, `editor`, `content_admin`, and `super_admin` cases.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_rls_policies_and_aal2.sql supabase/migrations/0004_storage_buckets_and_policies.sql tests/integration/rls-policies.test.ts
git commit -m "feat: enforce RLS, mandatory AAL2 MFA, and safe storage policies"
```

---

## Phase 4: Authentication, Security Guards & Admin Dashboard

### Task 5: Invite-Only Auth, `proxy.ts`, TOTP MFA Flow & Server Authorization Utilities

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/permissions/rbac.ts`
- Create: `src/lib/validation/common.ts`
- Create: `src/proxy.ts`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/mfa/page.tsx`
- Test: `tests/unit/validation-and-rbac.test.ts`

**Interfaces:**
- Produces:
  - `createBrowserSupabase(): SupabaseClient<Database>`
  - `createServerSupabase(): Promise<SupabaseClient<Database>>`
  - `requireAdminSession(options?: { requiredRoles?: AdminRole[]; requireFinancialApproval?: boolean }): Promise<AdminContext>`
  - `canPerform(role: AdminRole, action: AdminAction, flags?: { canApproveFinancial: boolean }): boolean`
  - `safeHttpUrlSchema`: Zod schema permitting only `http:` / `https:` URLs.
  - `proxy(request: NextRequest): Promise<NextResponse>` in `src/proxy.ts`.

- [ ] **Step 1: Write failing unit tests for URL validation, role matrix, and `requireAdminSession` AAL2 check**

```ts
// tests/unit/validation-and-rbac.test.ts
import { describe, expect, it } from 'vitest';
import { safeHttpUrlSchema } from '../../src/lib/validation/common';
import { canPerform } from '../../src/lib/permissions/rbac';

describe('URL validation and RBAC', () => {
  it('accepts https URLs and rejects javascript:/data: URLs', () => {
    expect(safeHttpUrlSchema.safeParse('https://cmt3.research.microsoft.com/MetaSphere2026').success).toBe(true);
    expect(safeHttpUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(safeHttpUrlSchema.safeParse('data:text/html,<script>').success).toBe(false);
  });

  it('enforces role boundaries for publish, user management, and financial approval', () => {
    expect(canPerform('editor', 'edit_draft')).toBe(true);
    expect(canPerform('editor', 'publish_content')).toBe(false);
    expect(canPerform('content_admin', 'publish_content')).toBe(true);
    expect(canPerform('content_admin', 'manage_users')).toBe(false);
    expect(canPerform('content_admin', 'publish_financial', { canApproveFinancial: false })).toBe(false);
    expect(canPerform('content_admin', 'publish_financial', { canApproveFinancial: true })).toBe(true);
    expect(canPerform('super_admin', 'manage_users')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/validation-and-rbac.test.ts`
Expected: FAIL (`Cannot find module`)

- [ ] **Step 3: Implement Supabase SSR clients, `src/proxy.ts`, `requireAdminSession()`, RBAC, Zod validators, and `/admin/login` + `/admin/mfa` UI**

Use `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `client.ts`/`server.ts`/`proxy.ts`, and `SUPABASE_SECRET_KEY` exclusively in `admin.ts`. In `proxy.ts`, refresh cookies via `supabase.auth.getClaims()` and redirect unauthenticated `/admin/*` requests (except `/admin/login`) to `/admin/login`, and `aal1` sessions (except `/admin/mfa`) to `/admin/mfa`. `/admin/mfa` handles first-time TOTP QR enrollment (`auth.mfa.enroll({ factorType: 'totp' })`) and code verification (`challengeAndVerify`).

- [ ] **Step 4: Run unit tests and typecheck**

Run: `npx vitest run tests/unit/validation-and-rbac.test.ts && npx tsc --noEmit`
Expected: PASS with 0 TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ src/proxy.ts src/app/admin/login/ src/app/admin/mfa/ tests/unit/validation-and-rbac.test.ts
git commit -m "feat: implement invite-only auth, TOTP MFA flow, proxy guard, and RBAC helpers"
```

---

### Task 6: Admin Dashboard Shell, Overview, Event Settings, Deadlines & External Links

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/overview/page.tsx`
- Create: `src/app/admin/event-settings/page.tsx`
- Create: `src/app/admin/deadlines/page.tsx`
- Create: `src/app/admin/resources/page.tsx`
- Create: `src/app/api/preview/route.ts`
- Create: `src/features/conference/actions.ts`
- Create: `src/features/deadlines/actions.ts`
- Create: `src/features/resources/actions.ts`
- Create: `src/lib/dates/ist.ts`
- Test: `tests/unit/ist-dates-and-actions.test.ts`

**Interfaces:**
- Produces:
  - `updateEditionSettingsAction(editionId: string, input: EditionSettingsInput): Promise<ActionResult>`
  - `upsertDeadlineAction(input: DeadlineInput): Promise<ActionResult>`
  - `publishContentAction(table: PublishableTable, id: string): Promise<ActionResult>` (writes `content_versions` + `audit_logs`, calls `revalidateTag(\`edition:${year}\`, { expire: 0 })`)
  - `upsertConferenceLinkAction(input: ConferenceLinkInput): Promise<ActionResult>`
  - `formatIstDateTime(iso: string): string` & `getCountdownParts(targetIso: string, nowMs: number): CountdownParts`

- [ ] **Step 1: Write failing tests for IST date formatting, countdown calculation, and action validation**

```ts
// tests/unit/ist-dates-and-actions.test.ts
import { describe, expect, it } from 'vitest';
import { formatIstDateTime, getCountdownParts } from '../../src/lib/dates/ist';

describe('IST dates and countdown', () => {
  it('formats timestamps explicitly in IST (UTC+5:30)', () => {
    expect(formatIstDateTime('2027-08-17T09:00:00+05:30')).toContain('IST');
    expect(formatIstDateTime('2027-08-17T09:00:00+05:30')).toContain('17 Aug 2027');
  });

  it('computes non-negative countdown parts and marks live after start time', () => {
    const start = Date.parse('2027-08-17T09:00:00+05:30');
    expect(getCountdownParts('2027-08-17T09:00:00+05:30', start - 90_061_000)).toEqual({
      days: 1, hours: 1, minutes: 1, seconds: 1, isLive: false,
    });
    expect(getCountdownParts('2027-08-17T09:00:00+05:30', start + 1000).isLive).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ist-dates-and-actions.test.ts`
Expected: FAIL (`Cannot find module`)

- [ ] **Step 3: Implement IST helpers, admin shell layout, Overview, Event Settings, Deadlines, External Links + Preview cookie route, and Server Actions**

Every Server Action calls `requireAdminSession()`, validates input with Zod, writes `draft` first (unless user is `content_admin`/`super_admin` invoking `publishContentAction`), inserts an immutable `audit_logs` row, and calls `revalidateTag(..., { expire: 0 })` only on published mutations. `/api/preview` sets an `HttpOnly` preview cookie scoped to authenticated admins so draft records can be previewed on public routes before publishing.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/unit/ist-dates-and-actions.test.ts && npx tsc --noEmit`
Expected: PASS with 0 TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/ src/app/api/preview/ src/features/ src/lib/dates/ tests/unit/ist-dates-and-actions.test.ts
git commit -m "feat: build admin dashboard core, event settings, deadlines, and external links CMS"
```

---

### Task 7: Remaining Admin CMS Modules (Speakers, Committees, Tracks, Programme, Sponsors, Registration, Uploads, Users & Audit)

**Files:**
- Create: `src/app/admin/speakers/page.tsx`
- Create: `src/app/admin/committees/page.tsx`
- Create: `src/app/admin/tracks/page.tsx`
- Create: `src/app/admin/programme/page.tsx`
- Create: `src/app/admin/sponsors/page.tsx`
- Create: `src/app/admin/registration/page.tsx`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/activity/page.tsx`
- Create: `src/features/people/actions.ts`
- Create: `src/features/programme/actions.ts`
- Create: `src/features/registration/actions.ts`
- Create: `src/features/admin-users/actions.ts`
- Test: `tests/unit/upload-and-financial-approval.test.ts`

**Interfaces:**
- Produces:
  - `uploadConferenceAssetAction(formData: FormData): Promise<ActionResult<{ url: string; path: string }>>` (rejects `.svg`/`.html`, checks magic bytes/MIME, max 10 MB)
  - `upsertRegistrationFeeAction(input: RegistrationFeeInput): Promise<ActionResult>` (saves `draft`; requires `canApproveFinancial` or `super_admin` to publish financial/bank/UPI changes)
  - `inviteAdminUserAction(input: { email: string; role: AdminRole; canApproveFinancial: boolean }): Promise<ActionResult>` (`super_admin` only, uses `SUPABASE_SECRET_KEY` admin client)

- [ ] **Step 1: Write failing tests for safe upload MIME filtering and financial-approval publishing rules**

```ts
// tests/unit/upload-and-financial-approval.test.ts
import { describe, expect, it } from 'vitest';
import { validateUploadFile } from '../../src/lib/validation/common';
import { canPublishFinancialRecord } from '../../src/lib/permissions/rbac';

describe('upload safety and financial approval', () => {
  it('rejects SVG and HTML uploads while allowing PNG/JPEG/WEBP/PDF', () => {
    expect(validateUploadFile({ name: 'bad.svg', type: 'image/svg+xml', size: 1024 }).ok).toBe(false);
    expect(validateUploadFile({ name: 'photo.webp', type: 'image/webp', size: 1024 }).ok).toBe(true);
    expect(validateUploadFile({ name: 'brochure.pdf', type: 'application/pdf', size: 1024 }).ok).toBe(true);
  });

  it('requires financial approval permission or super_admin to publish fees/bank details', () => {
    expect(canPublishFinancialRecord({ role: 'content_admin', canApproveFinancial: false })).toBe(false);
    expect(canPublishFinancialRecord({ role: 'content_admin', canApproveFinancial: true })).toBe(true);
    expect(canPublishFinancialRecord({ role: 'super_admin', canApproveFinancial: false })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/upload-and-financial-approval.test.ts`
Expected: FAIL (`validateUploadFile` / `canPublishFinancialRecord` not defined)

- [ ] **Step 3: Implement all remaining admin CRUD modules, upload validation, invite flow, and audit log viewer**

Implement React Hook Form + Zod forms using shadcn/ui inside `/admin/*` only. Keep existing Cloudinary URLs editable in URL inputs (validated as `https://` URLs) while offering Supabase Storage upload for new files.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/unit/upload-and-financial-approval.test.ts && npx tsc --noEmit`
Expected: PASS with 0 TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/ src/features/ src/lib/validation/ src/lib/permissions/ tests/unit/upload-and-financial-approval.test.ts
git commit -m "feat: add speakers, committees, programme, registration, uploads, and user management CMS"
```

---

## Phase 5: Dynamic Public Website & 2026 Archive (Zero Visual Regression)

### Task 8: Public Home, Call for Papers, Paper Submission & Registration Pages

**Files:**
- Create: `src/features/conference/queries.ts`
- Create: `src/components/home/CountdownTimer.tsx`
- Create: `src/components/home/CloudinaryVideoBg.tsx`
- Create: `src/components/home/Carousels.tsx`
- Create: `src/components/home/TrackModal.tsx`
- Create: `src/components/deadlines/DeadlinesSection.tsx`
- Create: `src/app/(public)/layout.tsx`
- Create: `src/app/(public)/page.tsx`
- Create: `src/app/(public)/call-for-papers/page.tsx`
- Create: `src/app/(public)/paper-submission/page.tsx`
- Create: `src/app/(public)/registration/page.tsx`
- Test: `tests/unit/queries-and-jsonld.test.ts`

**Interfaces:**
- Produces:
  - `getEditionSnapshot(year?: number, options?: { includeDrafts?: boolean }): Promise<EditionSnapshot>` (tagged with `unstable_cache` / `cacheTag(\`edition:${year}\`)`)
  - `buildEventJsonLd(edition: EditionSnapshot): Record<string, unknown>`

- [ ] **Step 1: Write failing unit tests for edition queries and dynamic JSON-LD structured data**

```ts
// tests/unit/queries-and-jsonld.test.ts
import { describe, expect, it } from 'vitest';
import { buildEventJsonLd } from '../../src/features/conference/queries';

describe('dynamic Event JSON-LD', () => {
  it('generates schema.org Event metadata from active edition dates and INR offer', () => {
    const jsonLd = buildEventJsonLd({
      year: 2027,
      title: 'MetaSphere 2027',
      startDate: '2027-08-17T09:00:00+05:30',
      endDate: '2027-08-18T18:00:00+05:30',
      venueName: 'IEM Ashram Building',
      canonicalUrl: 'https://metasphere2027.iem.edu.in',
      minInrFee: 4000,
    });
    expect(jsonLd.startDate).toBe('2027-08-17T09:00:00+05:30');
    expect(jsonLd.name).toContain('2027');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/queries-and-jsonld.test.ts`
Expected: FAIL (`Cannot find module`)

- [ ] **Step 3: Implement cached edition queries, dynamic JSON-LD, and migrate Home, CFP, Paper Submission & Registration pages**

Reproduce the exact layout, typography, Tailwind classes, `#fffbf5` / `#f97316` / `#d946ef` styling, Cloudinary background videos (`CloudinaryVideoBg.tsx`), carousels (`Carousels.tsx`), local `Assets/` templates/QR images, Microsoft CMT CTA, and Microsoft Forms + INR/USD/bank/UPI fee blocks—reading all text, dates, deadlines, fees, and URLs dynamically from Supabase.

- [ ] **Step 4: Run tests and Next.js build**

Run: `npx vitest run tests/unit/queries-and-jsonld.test.ts && npm run build`
Expected: PASS and production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/conference/queries.ts src/components/ src/app/\(public\)/ tests/unit/queries-and-jsonld.test.ts
git commit -m "feat: migrate public home, CFP, paper submission, and registration pages to Supabase"
```

---

### Task 9: Speakers, Committees, Technical Programme, Sponsors, Contact, SEO & `/2026` Archive

**Files:**
- Create: `src/components/speakers/SpeakerGrid.tsx`
- Create: `src/components/committees/CommitteeDirectory.tsx`
- Create: `src/components/programme/ProgrammeSchedule.tsx`
- Create: `src/app/(public)/speakers/page.tsx`
- Create: `src/app/(public)/committees/advisory/page.tsx`
- Create: `src/app/(public)/committees/scientific/page.tsx`
- Create: `src/app/(public)/committees/technical/page.tsx`
- Create: `src/app/(public)/committees/aaia/page.tsx`
- Create: `src/app/(public)/technical-programs/page.tsx`
- Create: `src/app/(public)/sponsors/page.tsx`
- Create: `src/app/(public)/contact/page.tsx`
- Create: `src/app/2026/layout.tsx`
- Create: `src/app/2026/page.tsx`
- Create: `src/app/2026/[slug]/page.tsx`
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Test: `tests/integration/public-routes-smoke.test.ts`

**Interfaces:**
- Consumes: `getEditionSnapshot(year, options)` from Task 8.
- Produces: Complete parity across all 13 original pages plus `/2026` archived edition banner & navigation.

- [ ] **Step 1: Write failing integration test verifying all public routes and `/2026` archive resolve**

```ts
// tests/integration/public-routes-smoke.test.ts
import { describe, expect, it } from 'vitest';
import sitemap from '../../src/app/sitemap';

describe('sitemap and public route coverage', () => {
  it('publishes canonical URLs for all MetaSphere 2027 routes and /2026 archive', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/speakers'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/committees/aaia'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/2026'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/public-routes-smoke.test.ts`
Expected: FAIL (`Cannot find module '../../src/app/sitemap'`)

- [ ] **Step 3: Implement Speakers, 4 Committee pages, dynamic day-grouped Technical Programme, Sponsors, Contact, SEO `sitemap.ts`/`robots.ts`, and `/2026` Archive routes**

Preserve the exact National/International committee toggle styling (`#f97316`), exact Cloudinary sponsor/video URLs, and Google Maps embeds on Contact. On `/2026/*`, render an unobtrusive top archive banner linking back to the active 2027 edition while querying `year = 2026`.

- [ ] **Step 4: Run tests and production build**

Run: `npx vitest run tests/integration/public-routes-smoke.test.ts && npm run build`
Expected: PASS and full Next.js build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/ src/app/ tests/integration/public-routes-smoke.test.ts
git commit -m "feat: complete public pages, dynamic programme, SEO sitemap, and 2026 archive"
```

---

## Phase 6: End-to-End Security, Theme Preservation & Accessibility Verification

### Task 10: Playwright E2E Suite (CMS Publish Flow, Security Gates, Visual Tokens, Cloudinary & WCAG 2.2 AA)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/admin-publish-flow.spec.ts`
- Create: `tests/e2e/theme-and-media-preservation.spec.ts`
- Create: `tests/e2e/security-and-a11y.spec.ts`

**Interfaces:**
- Consumes: Public routes (`/`..`/contact`, `/2026`), legacy `.html` redirects, `/admin/*` auth/MFA/CMS routes, and `docs/migration/legacy-inventory.json`.
- Produces: Automated browser verification gate covering publish propagation, exact theme/Cloudinary preservation, RBAC/MFA denial, and keyboard/contrast accessibility.

- [ ] **Step 1: Write failing Playwright E2E specs**

```ts
// tests/e2e/theme-and-media-preservation.spec.ts
import { test, expect } from '@playwright/test';
import inventory from '../../docs/migration/legacy-inventory.json';

test('preserves #fffbf5 background, #f97316 CTA, banner SVG, and Cloudinary URLs', async ({ page }) => {
  await page.goto('/');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(255, 251, 245)');
  const banner = page.locator('header img[alt="Conference Banner"]');
  await expect(banner).toBeVisible();
  const html = await page.content();
  for (const url of inventory.cloudinaryUrls.slice(0, 5)) {
    expect(html).toContain(url);
  }
});
```

- [ ] **Step 2: Run E2E tests before fixes to verify harness execution**

Run: `npx playwright test`
Expected: Executes against local Next.js + Supabase and fails on any unverified assertions or missing `playwright.config.ts`.

- [ ] **Step 3: Implement `playwright.config.ts` and remaining E2E specs (`admin-publish-flow.spec.ts`, `security-and-a11y.spec.ts`) and fix any uncovered issues**

Verify login → TOTP MFA → draft deadline → hidden on `/` → preview → publish → visible on `/` and `/call-for-papers` in `IST (UTC+5:30)` + recorded in `/admin/activity`; verify `aal1`/unauth redirects, `editor` denied `/admin/users`, all 13 `.html` redirects, and WCAG 2.2 AA keyboard/landmark/contrast checks.

- [ ] **Step 4: Re-run full Vitest + Playwright suite**

Run: `npx vitest run && npx playwright test`
Expected: All unit, integration, RLS, and E2E tests pass with 0 failures.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/
git commit -m "test: add E2E verification for publish flow, security gates, a11y, and theme preservation"
```

---

## Phase 7: Legacy Cleanup, CI/CD & Production Cutover

### Task 11: Remove Legacy Static Root Artifacts, Add CI Pipeline & Document Cutover Runbook

**Files:**
- Remove: `*.html` (13 root legacy HTML files, now served via App Router + `next.config.ts` redirects), `script.js`, `Style.css`, `Output.css`, `firebase.json`, `.firebaserc`, `amplify.yml`, `sitemap.xml`, `robots.txt`
- Create: `.github/workflows/ci.yml`
- Create: `docs/operations/production-cutover-runbook.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: Finalized Next.js 16 app, `supabase/migrations/*`, Vitest + Playwright suites.
- Produces: Automated GitHub Actions CI workflow and institutional handoff/cutover runbook.

- [ ] **Step 1: Write failing CI workflow check and `.github/workflows/ci.yml`**

Configure jobs for `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`, and `npx playwright test` against ephemeral/local Supabase.

- [ ] **Step 2: Remove superseded legacy static files and update `README.md` + `docs/operations/production-cutover-runbook.md`**

Remove the 13 root `.html` files (retaining `legacy-2026-static` git tag and `/2026` DB-backed route), `script.js`, `Style.css`, `Output.css`, `firebase.json`, `.firebaserc`, `amplify.yml`, `sitemap.xml`, and `robots.txt`. Document in `production-cutover-runbook.md`: institutional ownership (IEM-controlled GitHub org, Supabase org, Vercel team, `iem.edu.in` DNS approver, >=2 faculty Super Admins, offline TOTP recovery codes), staging approval, `supabase db push`, 2027 content import, and DNS cutover verification.

- [ ] **Step 3: Run full verification after cleanup**

Run: `npx tsc --noEmit && npx vitest run && npm run build && npx playwright test`
Expected: All checks pass cleanly on the final codebase with 0 errors and all tests passing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove legacy static hosting files, add CI, and finalize cutover runbook"
```
