import { expect, test } from "@playwright/test";

const PROTECTED_ADMIN_ROUTES = [
  "/admin/overview",
  "/admin/event-settings",
  "/admin/deadlines",
  "/admin/resources",
  "/admin/speakers",
  "/admin/committees",
  "/admin/tracks",
  "/admin/programme",
  "/admin/sponsors",
  "/admin/registration",
  "/admin/users",
  "/admin/activity",
];

const PUBLIC_LAYOUT_ROUTES = [
  "/",
  "/call-for-papers",
  "/paper-submission",
  "/registration",
  "/speakers",
  "/committees/advisory",
  "/technical-programs",
  "/sponsors",
  "/contact",
];

test.describe("Security Headers, Admin Route Guards & WCAG 2.2 AA Accessibility", () => {
  test("redirects all unauthenticated /admin/* routes to /admin/login and guards /api/preview", async ({
    request,
  }) => {
    for (const route of PROTECTED_ADMIN_ROUTES) {
      const res = await request.get(route, { maxRedirects: 0 });
      expect(
        [302, 303, 307],
        `Expected redirect on ${route}`
      ).toContain(res.status());
      expect(res.headers()["location"]).toContain("/admin/login");
    }

    const previewRes = await request.get("/api/preview?edition=2027", {
      maxRedirects: 0,
    });
    expect([302, 307, 401, 503]).toContain(previewRes.status());
    expect(previewRes.headers()["set-cookie"] ?? "").not.toContain(
      "__prerender_bypass"
    );
  });

  test("emits strict security headers and valid SEO sitemap / robots", async ({
    request,
  }) => {
    const homeRes = await request.get("/");
    expect(homeRes.status()).toBe(200);
    const headers = homeRes.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain(
      "https://res.cloudinary.com"
    );

    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    const sitemapXml = await sitemapRes.text();
    expect(sitemapXml).toContain("/call-for-papers");
    expect(sitemapXml).toContain("/2026");
    expect(sitemapXml).not.toContain("/admin");

    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    const robotsTxt = await robotsRes.text();
    expect(robotsTxt).toContain("Disallow: /admin");
    expect(robotsTxt).toContain("Disallow: /api");
  });

  test("passes landmark, alt-text, IST clarity, keyboard navigation, and zero horizontal overflow checks", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    for (const route of PUBLIC_LAYOUT_ROUTES) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toBeVisible();

      const a11yAudit = await page.evaluate(() => {
        const h1Count = document.querySelectorAll("h1").length;
        const headerCount = document.querySelectorAll("header").length;
        const mainCount = document.querySelectorAll("main").length;
        const footerCount = document.querySelectorAll("footer").length;
        const imgsWithoutAlt = Array.from(document.querySelectorAll("img"))
          .filter((img) => !img.hasAttribute("alt") || img.alt.trim() === "")
          .map((img) => img.src);
        const horizontalOverflow =
          document.documentElement.scrollWidth > window.innerWidth + 1;

        return {
          h1Count,
          headerCount,
          mainCount,
          footerCount,
          imgsWithoutAlt,
          horizontalOverflow,
        };
      });

      expect(a11yAudit.h1Count, `${route} h1 count`).toBe(1);
      expect(a11yAudit.headerCount, `${route} header landmark`).toBe(1);
      expect(a11yAudit.mainCount, `${route} main landmark`).toBe(1);
      expect(a11yAudit.footerCount, `${route} footer landmark`).toBe(1);
      expect(a11yAudit.imgsWithoutAlt, `${route} missing alt text`).toEqual([]);
      expect(a11yAudit.horizontalOverflow, `${route} desktop overflow`).toBe(
        false
      );

      // Mobile viewport overflow check
      await page.setViewportSize({ width: 390, height: 844 });
      const mobileOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(mobileOverflow, `${route} mobile overflow`).toBe(false);
    }

    // Explicit IST time labels on homepage and programme schedule
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText("IST (UTC+5:30)");

    await page.goto("/technical-programs", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText("IST (UTC+5:30)");

    // Header Authors dropdown keyboard navigation
    const authorsBtn = page.getByRole("button", { name: /Authors/i });
    await authorsBtn.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Call For Papers" })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Call For Papers" })
    ).toBeHidden();
  });
});
