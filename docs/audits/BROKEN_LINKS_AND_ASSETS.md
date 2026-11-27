# Broken Links & Assets Report — MetaSphere 2027

**Date:** 2026-11-27  
**Tooling Used:** Automated Playwright + Node HTTP crawler (`audit-runner.mjs` + follow-up `load`/scroll check against `next start` on `127.0.0.1:3006` and `127.0.0.1:3007`)

---

## 1. Summary Metrics

| Category | Checked | Broken | Notes |
|---|---|---|---|
| Public Routes (MetaSphere 2027) | `12` | `0` | All returned HTTP `200` |
| Archived Routes (`/2026` & `/2026/*`) | `12` | `0` | All returned HTTP `200` |
| Auth Entry Routes (`/admin/login`, `/admin/mfa`) | `2` | `0` | `/admin/login` `200`; `/admin/mfa` redirected cleanly to `/admin/login` (`307` -> `200`) |
| Legacy `.html` Redirects | `13` | `0` | All 13 returned HTTP `308` to canonical Next.js destinations |
| Unique Internal `<a href>` Links & Downloads | `23` | `0` | Includes all public routes, `/2026/*` routes, and `.pptx`, `.doc`, `.docx` templates |
| External `<a href>` Links Checked (`HEAD`/`GET`) | `5` | `0` | Microsoft CMT, MS Forms, 2 Google Drive links, Overleaf LaTeX template all returned `200` |
| Rendered `<img>` Elements (Full Load + Scroll) | All across 10 media routes (`25` on `/`, `7` on `/speakers`, `6` on `/sponsors`, etc.) | `0` | Initially flagged as incomplete at `domcontentloaded + 450ms` due to 4.92 MB banner SVG + lazy offscreen carousels; all decoded cleanly (`complete === true && naturalWidth > 0`) on `load` + scroll |
| `public/` Assets Referenced in Manifest | `22` `localAssets` + `2` favicons | `0` missing | Verified via `tests/unit/preservation-manifest.test.ts` |

---

## 2. Findings & Anomalies

### LNK-01 [High — Functional/Content]: MetaSphere 2027 Seed Links Still Point to MetaSphere 2026 Microsoft CMT Portal & Unscoped `2026` Template Downloads
- **Affected Files / Routes:** [`src/lib/fallback/seed-snapshot.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/fallback/seed-snapshot.ts), [`/call-for-papers`](http://127.0.0.1:3006/call-for-papers), [`/paper-submission`](http://127.0.0.1:3006/paper-submission), [`/registration`](http://127.0.0.1:3006/registration)
- **Evidence:** Both active 2027 routes and archived 2026 routes resolve `cmtPortal` to `https://cmt3.research.microsoft.com/MetaSphere2026` and `registrationForm` to the existing Microsoft Forms URL (`forms.cloud.microsoft/...`). While both external URLs currently return HTTP `200`, publishing MetaSphere 2027 without creating and updating the 2027 CMT track and registration form via `/admin/resources` will send 2027 authors to 2026 portals.
- **Recommended Action:** Track updating `cmt_portal` and `registration_form` URLs in `/admin/resources` for edition `2027` as a mandatory pre-launch checklist item once the 2027 Microsoft CMT portal is opened.

### LNK-02 [Medium — Performance/Asset UX]: Multi-Megabyte Banner & Gallery SVGs Cause Delayed Paint (`>450ms` Even on Localhost)
- **Affected Assets:**
  - `/Assets/METASPHERE WEBSITE BANNER .svg` (**4,922,743 bytes / ~4.69 MiB**) — rendered on every public route
  - `/Assets/01.svg` (**4,875,752 bytes / ~4.65 MiB**)
  - `/Assets/003.svg` (**4,873,000 bytes / ~4.65 MiB**)
  - `/Assets/qr-code.png` (**1,160,962 bytes / ~1.11 MiB**)
  - `/Assets/002.jpg` (**1,081,662 bytes / ~1.03 MiB**)
- **Evidence:** During initial `domcontentloaded + 450ms` inspection on `/`, `/Assets/METASPHERE WEBSITE BANNER .svg` had not yet finished decoding (`naturalWidth === 0` at 450ms before completing on `load`), whereas subpages completed faster once cached.
- **Recommended Optimization:** Compress/rasterize embedded bitmaps inside the ~4.9 MB SVGs into optimized WebP/AVIF + responsive dimensions (`public/Assets/`), keeping visual fidelity identical. (Consult user before altering visual assets per visual-preservation constraint.)

### LNK-03 [Low — Asset Naming]: Trailing Space in Banner SVG Filename
- **Affected File:** `public/Assets/METASPHERE WEBSITE BANNER .svg` (space before `.svg`)
- **Evidence:** Works over HTTP with URL encoding (`%20`), confirmed HTTP `200`, but fragile in shell scripts and manual CMS path edits. Preserved verbatim per legacy asset parity rule.

---

## 3. Untested Link & Media Surfaces

- **Cloudinary Video Playback Streaming:** `<video><source src="https://res.cloudinary.com/...">` sources were verified as preserved in DOM/seed (`36/36` Cloudinary URLs in `supabase/seed.sql`), but full video byte-range buffering/playback across multiple browser codecs was not run.
- **Embedded Google Maps Iframe Contents:** `frame-src https://www.google.com https://maps.google.com` is permitted in CSP; external Google Maps tile rendering inside the iframe was not asserted.
- **Uploaded CMS Assets from Supabase Storage (`conference-public` / signed `conference-private`):** Untested until live Supabase Storage is connected.
