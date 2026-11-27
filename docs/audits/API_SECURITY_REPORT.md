# API & Server Action Security Report — MetaSphere 2027

**Date:** 2026-11-27  
**Scope:** [`src/app/api/preview/route.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/api/preview/route.ts), `src/features/**/actions.ts`, [`src/features/resources/upload-action.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/features/resources/upload-action.ts), [`src/lib/security/headers.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/security/headers.ts), [`src/lib/validation/common.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/validation/common.ts), [`src/components/pages/HomePageView.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/components/pages/HomePageView.tsx)

---

## 1. Endpoint & Server Action Surface Audit

- **REST / Route Handlers:** Single API endpoint [`GET /api/preview`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/api/preview/route.ts). Unconfigured check on `127.0.0.1:3006/api/preview` returned HTTP `503`. Open-redirect check `SAFE_RELATIVE_REDIRECT_RE = /^\/(?!\/|\\)/` blocks `//evil.com` and `/\evil.com`.
- **Next.js Server Actions (`src/features/*/actions.ts`):** Every exported Server Action invokes `await requireAdminSession(...)` before parsing input or hitting the database, and validates inputs using Zod schemas (`safeHttpUrlSchema` restricts links to `http:` / `https:`, rejecting `javascript:` / `data:` / control chars). All `upsert*` actions verify `beforeRow.edition_id === data.editionId` to prevent cross-edition IDOR mutations.

---

## 2. Confirmed Security Findings

### API-01 [Medium — Confirmed]: Upload Action Trusts Client MIME Header Without Magic-Byte Verification
- **Affected Files:** [`src/features/resources/upload-action.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/features/resources/upload-action.ts#L42-L64), [`src/lib/validation/common.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/validation/common.ts#L84-L133)
- **Evidence:** `validateUploadFile()` validates `file.name` extension and `file.type` (browser-supplied MIME string), and passes `contentType: file.type` directly to `supabase.storage.from(bucket).upload(...)` without inspecting the binary `arrayBuffer`. If an authorized or compromised admin uploads an HTML/SVG/script document renamed to `.png` with a forged `Content-Type: image/png`, it passes server validation.
- **Recommended Fix:** Inspect leading magic bytes of `Uint8Array(arrayBuffer)` server-side (PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF`, WEBP `RIFF....WEBP`, PDF `%PDF-`) and verify the detected file signature matches the extension and MIME before upload; additionally if `audit_logs` insert fails after upload, delete the uploaded storage object to avoid orphaned files.
- **Verification Criteria:** Unit tests pass polyglot / spoofed HTML-as-PNG and valid PNG/JPEG/WEBP/PDF binary headers, rejecting spoofed buffers.

### API-02 [Medium — Confirmed]: JSON-LD Serialization Permits `</script>` Tag Breakout
- **Affected File:** [`src/components/pages/HomePageView.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/components/pages/HomePageView.tsx#L36-L39)
- **Evidence:** `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />` outputs unescaped `<` characters. While `eventJsonLd` fields originate from authenticated `aal2` admins, CMS text containing `</script>` prematurely closes the `<script>` tag in HTML parsing, creating a stored XSS vector from a compromised `editor`/`admin` account.
- **Recommended Fix:** Replace `JSON.stringify(eventJsonLd)` with `JSON.stringify(eventJsonLd).replace(/</g, "\\u003c")`.
- **Verification Criteria:** Unit test in `tests/unit/queries-and-jsonld.test.ts` asserts serialized JSON-LD contains zero literal `<` characters.

### API-03 [Medium — Confirmed]: CSP Uses `script-src 'unsafe-inline'` & `/admin` Lacks Explicit `Cache-Control: no-store`
- **Affected File:** [`src/lib/security/headers.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/lib/security/headers.ts#L10-L49)
- **Evidence:** HTTP response headers observed on `127.0.0.1:3006` emit `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`. However:
  1. `script-src 'self' 'unsafe-inline'` weakens XSS mitigation (no nonce-based CSP).
  2. `Strict-Transport-Security` is omitted from `next.config.ts` (relies on Vercel edge in production, absent for self-hosted deployments).
  3. `/admin/*` responses do not enforce `Cache-Control: no-store, max-age=0, private`.
- **Recommended Fix:** Add `Cache-Control: private, no-store, max-age=0` on `/admin/:path*` and `/api/:path*` in `next.config.ts`, consider nonce-based CSP if compatible with Next.js static prerendering, and document HSTS at reverse-proxy/Vercel edge.
- **Verification Criteria:** Playwright header assertions verify `Cache-Control` on `/admin/login` and `/api/preview`.

### API-04 [Low — Confirmed]: `/api/preview` Toggles Draft Mode on HTTP `GET` Without Origin/CSRF Check
- **Affected File:** [`src/app/api/preview/route.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/api/preview/route.ts#L23-L58)
- **Evidence:** Clicking a cross-site link to `/api/preview?edition=2027` or `/api/preview?disable=1` while an admin holds an `aal2` cookie performs a state change (setting or clearing Next.js `__prerender_bypass` cookie) on an idempotent-expected `GET` endpoint without `Sec-Fetch-Site` check. (Note: `resolveSafeRedirectPath` also accepts tabs/newlines inside `rawPath` before `new URL()` normalizes them.)
- **Recommended Fix:** Validate `Sec-Fetch-Site` (`same-origin` or `none`) or switch preview activation from admin UI to a Server Action (`POST`), keeping `GET` strictly for read-only redirects or explicit CSRF token verification; additionally strip control characters `[\u0000-\u001f\u007f]` from `redirect`.
- **Verification Criteria:** Cross-site GET without matching `Sec-Fetch-Site` fails closed.

### API-05 [Low — Confirmed]: `delete*Action` Handlers Revalidate Caller-Supplied `editionYear` Without Verifying Against `beforeRow.edition_id`
- **Affected Files:** [`src/features/deadlines/actions.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/features/deadlines/actions.ts#L159), [`src/features/programme/actions.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/features/programme/actions.ts#L153), [`src/features/registration/actions.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/features/registration/actions.ts#L317), [`src/features/sponsors/actions.ts`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/features/sponsors/actions.ts#L138)
- **Evidence:** Delete actions accept `editionYear` as an argument and pass it directly to `revalidateEdition(parsedYear.data)` rather than resolving the year from `beforeRow.edition_id`. Authorization still applies cleanly, so this is only a stale-cache risk if the client passes the wrong year.
- **Recommended Fix:** Resolve edition year via `resolveEditionYear(supabase, beforeRow.edition_id)` on delete, matching the `upsert*` pattern.

---

## 3. Untested API Areas

- **Authenticated Live Server Actions Execution:** Server Action CRUD, `upsert*` validation responses, and `uploadConferenceAssetAction` were tested via mocked unit tests (`tests/unit/ist-dates-and-actions.test.ts`, `upload-and-financial-approval.test.ts`), **NOT** against live Next.js + PostgreSQL + Storage HTTP requests.
