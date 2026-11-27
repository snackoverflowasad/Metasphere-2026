# Accessibility (WCAG 2.2 AA) Report — MetaSphere 2027

**Date:** 2026-11-27  
**Tooling Used:** Live Playwright DOM, ARIA, Landmark, Heading, and Computed-Style Inspection across all 26 routes  
**Unavailable Tooling:** `@axe-core/playwright` and `lighthouse` CLI are not installed locally (read-only audit prohibition against modifying `package.json`); full automated `axe-core` rule-engine execution remains **untested**.

---

## 1. Verified Accessibility Baseline

- **Document Language:** `<html lang="en">` verified across all 26 routes.
- **Landmark Regions:** All 24 public & `/2026` routes expose `header=1`, `nav=1`, `main=1`, `footer=1`; `/admin/login` exposes `main=1`.
- **Single Primary Heading:** Every single tested route (`26/26`) has exactly `h1Count = 1`.
- **Image Alt Attributes & Button Labels:** Across all 26 routes inspected in Chromium, **0 images had missing/empty `alt` text** (`missingAlt: []`), and **0 `<button>` elements lacked accessible text/`aria-label`/`title`** (`unlabeledBtns: 0`).
- **Keyboard Dismissal & Overflow:** Header dropdowns and Track Modal dismiss cleanly via `Escape`, and mobile `390×844` layout has `0px` horizontal overflow across all 26 routes.

---

## 2. Confirmed Accessibility Findings (WCAG 2.2 Level A / AA)

### A11Y-01 [High — Confirmed]: Low Color Contrast on Header Nav Links (`~2.15:1`) Over `#fffbf5` Subpages
- **Affected Component:** [`src/components/layout/PublicHeader.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/components/layout/PublicHeader.tsx#L83)
- **Measured Evidence:** On non-video subpages (`/speakers`, `/sponsors`, `/registration`, `/contact`, etc.), `<header>` uses `bg-black/30` (`getComputedStyle`: `oklab(0 0 0 / 0.3)`), compositing over the `#fffbf5` (`rgb(255, 251, 245)`) page background to ~`#B3B0AC` while nav links render `text-white` (`rgb(255, 255, 255)`). Computed contrast ratio is **~2.15:1**, failing WCAG 2.2 SC 1.4.3 minimum `4.5:1` for normal text.
- **Recommended Fix:** Use an opaque or higher-opacity dark surface behind white nav text (e.g., `bg-slate-900/90` or a dedicated dark header bar below the banner) while preserving the `#fffbf5` page ground and `#f97316` accents. (Check visual approval with stakeholders first per theme lock.)
- **Verification Criteria:** Computed contrast ratio of header nav text against rendered header backdrop >= `4.5:1`.

### A11Y-02 [Medium — Confirmed]: White Text on `#f97316` Primary Buttons (`~2.80:1` Contrast Ratio)
- **Affected Components:** Header `"Register Now"`, Track CTA buttons, Committee `"National"` active pill (`bg-[#f97316] text-white`)
- **Measured Evidence:** White (`#FFFFFF`) on `#f97316` (`rgb(249, 115, 22)`) yields a WCAG relative luminance contrast ratio of **~2.80:1**, below `4.5:1` for normal text and `3.0:1` for large/UI text. Note that `#f97316` was intentionally preserved from the legacy 2026 website design per explicit user directive.
- **Recommended Fix:** Either use `#c2410c` (`orange-700`, `~5.17:1` with white) / dark `#1a202c` text (`#f97316` + `#1a202c` = **~6.45:1**) if contrast remediation is prioritized over strict hex lock, or document the explicit brand-hex exception.

### A11Y-03 [Medium — Confirmed]: Skipped Heading Levels Across Subpages and Footer (`H1 -> H4`, `H1 -> H3`, `H2 -> H4`)
- **Affected Routes:**
  - `/committees/advisory`, `/committees/technical`, `/committees/aaia` (and `/2026/*` equivalents): `["H1", "H4", "H4"]` (skips `H2` and `H3` straight to footer `H4`)
  - `/committees/scientific`: `["H1", "H3", "H3", "H4", "H4"]` (skips `H2`)
  - `/call-for-papers`, `/speakers`: `["H1", "H2", "H3", ..., "H4"]`
- **Affected Component:** `PublicFooter.tsx` uses `<h4>` for footer columns, causing skipped heading levels when pages end at `<h1>` or `<h2>`.
- **Recommended Fix:** Replace structural `<h4` footer section headings with `<h2>` styled identically, and promote Committee section headings in `CommitteeDirectory.tsx` / `CommitteeView.tsx` cleanly (`h2` -> `h3`).

### A11Y-04 [Medium — Confirmed]: Missing Skip-to-Main-Content Link
- **Affected File:** [`src/app/(public)/layout.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/(public)/layout.tsx#L55), [`src/app/2026/layout.tsx`](file:///e:/New%20folder%20(10)/Meta-Sphere%202026/Project-IEM/src/app/2026/layout.tsx#L29)
- **Evidence:** `landmarks.skipLink` measured `false` across all 26 routes (`<main>` has no `id="main-content"` target and no visually hidden `"Skip to main content"` anchor before `<PublicHeader>`).
- **Recommended Fix:** Add `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>` and `id="main-content"` on `<main>`.

---

## 3. Untested Accessibility Areas

- **`axe-core` Full Rule Scan & Screen Reader Verification:** Automated WCAG rule coverage (ARIA roles inside headless dialogs, live regions on countdown/filter counts, table caption/scope checks) and manual NVDA/VoiceOver testing remain untested.
