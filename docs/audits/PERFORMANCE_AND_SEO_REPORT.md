# Performance & SEO Report — MetaSphere 2027

**Date:** 2026-11-27  
**Tooling Used:** `next build` output inspection + live Chromium timing & DOM SEO crawl (`127.0.0.1:3006`) + `public/` static file size inventory  
**Unavailable Tooling:** `lighthouse` CLI is not installed locally; mobile 4G throttled Core Web Vitals (`LCP`, `INP`, `CLS` field/lab scores) remain **untested**.

---

## 1. Performance Measurements & Findings

- **Localhost Cold `domcontentloaded + 450ms` Timings:** `554ms` (`/admin/mfa` redirect) to `1244ms` (`/2026/committees/aaia`); `/` loaded in `853ms`, `/call-for-papers` in `597ms`, `/registration` in `733ms`.
- **Static Prerendering (`next build`):** `30/30` public + `/2026/*` + sitemap routes prerender cleanly with `revalidate: 3600` (`edition:<year>` cache tag).

### PERF-01 [High — Confirmed]: Three Multi-Megabyte SVGs (~4.87–4.92 MB Each) and Unoptimized Images
- **Affected Assets in `public/Assets/`:**
  - `/Assets/METASPHERE WEBSITE BANNER .svg`: **4,922,743 bytes (4.69 MiB)** — fetched on EVERY public route inside `PublicHeader` with `fetchPriority="high"`
  - `/Assets/01.svg`: **4,875,752 bytes (4.65 MiB)**
  - `/Assets/003.svg`: **4,873,000 bytes (4.65 MiB)**
  - `/Assets/qr-code.png`: **1,160,962 bytes (1.11 MiB)**
  - `/Assets/002.jpg`: **1,081,662 bytes (1.03 MiB)**
  - `/Assets/book.png`: **570,317 bytes (557 KiB)**
- **Impact:** On slower mobile networks (4G/3G), a ~4.9 MB SVG loaded in the global header blocks first-paint hero banner readiness and drives high LCP. Note that visual assets and Cloudinary links were preserved untouched per explicit project constraint.
- **Recommended Fix:** Optimize embedded raster bitmaps inside `METASPHERE WEBSITE BANNER .svg`, `01.svg`, and `003.svg` (or convert embedded raster payload to responsive `<Image>` WebP/AVIF while preserving identical visual appearance), and resize `qr-code.png` / `book.png`.

---

## 2. SEO Findings & Audit Matrix

- **Verified Working Controls:**
  - `/sitemap.xml` returns HTTP `200` (`4,336` bytes XML) listing active 2027 routes (`priority: 1` / `0.8`) and archived `/2026` routes (`priority: 0.4` / `0.3`).
  - `/robots.txt` returns HTTP `200` allowing `/` and disallowing `/admin` and `/api`, linking `Sitemap: https://metasphere2027.iem.edu.in/sitemap.xml`.
  - All `13` legacy `.html` URLs return HTTP `308` permanent redirects to canonical Next.js routes.
  - `/` and `/2026` each emit valid Schema.org `Event` JSON-LD (`jsonLdCount: 1`).

### SEO-01 [Medium — Confirmed]: Duplicate Brand Suffix (`| MetaSphere 2027 | MetaSphere`) in Page Titles
- **Affected Files:** [`src/app/layout.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/layout.tsx#L14) (`template: "%s | MetaSphere"`) + all 11 `(public)` subpages + [`src/app/2026/[...slug]/page.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/2026/%5B...slug%5D/page.tsx#L59)
- **Measured Evidence:** Live `<title>` values rendered as `"Call for Papers | MetaSphere 2027 | MetaSphere"` and `"Call for Papers | MetaSphere 2026 (Archived) | MetaSphere"`.
- **Recommended Fix:** Strip the trailing `"| MetaSphere ..."` suffix from child page `title` strings when using `RootLayout`'s `template`, or remove `template` from `RootLayout`.

### SEO-02 [Medium — Confirmed]: Canonical URL Missing on 11/12 Active Routes and 12/12 `/2026` Routes
- **Affected Files:** `src/app/(public)/*/page.tsx`, `src/app/2026/page.tsx`, `src/app/2026/[...slug]/page.tsx`
- **Measured Evidence:** Crawl confirmed `canonical: "https://metasphere2027.iem.edu.in"` on `/` ONLY; all 11 sub-routes and all 12 `/2026` routes had empty `link[rel="canonical"]` (`""`). `RootLayout` also omits `metadataBase`.
- **Recommended Fix:** Set `metadataBase` and emit per-route `alternates.canonical` on all active and `/2026` archived routes.

### SEO-03 [Low — Confirmed]: `robots.ts` and `sitemap.ts` Derive Base URL From Different Sources
- **Affected Files:** [`src/app/robots.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/robots.ts#L4-L6), [`src/app/sitemap.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/sitemap.ts#L20-L21)
- **Evidence:** `sitemap.ts` reads `siteSettings.canonicalUrl` from CMS, whereas `robots.ts` reads `process.env.NEXT_PUBLIC_SITE_URL` (unlisted in `.env.example`), defaulting to `https://metasphere2027.iem.edu.in`.

---

## 3. Untested Performance / SEO Areas

- **Lighthouse Audits (Mobile & Desktop CWV):** Not executed (`lighthouse` CLI not installed). Real-world LCP, CLS, INP, and TBT on 4G throttling require running Lighthouse against a staging deployment.
