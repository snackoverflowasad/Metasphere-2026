import { expect, test } from "@playwright/test";
import inventory from "../../docs/migration/legacy-inventory.json";

test.describe("Theme, Media & Multi-Edition Preservation", () => {
  test("preserves exact #fffbf5 background, #f97316 primary CTA, banner SVG, Cloudinary media, and Track Modal", async ({
    page,
  }) => {
    await page.goto("/");

    // Computed colors match MetaSphere 2026 exact palette
    const colors = await page.evaluate(() => {
      const bodyStyle = getComputedStyle(document.body);
      const cta = document.querySelector("a.btn-register");
      const ctaStyle = cta ? getComputedStyle(cta) : null;
      return {
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        ctaBg: ctaStyle?.backgroundColor ?? null,
      };
    });

    expect(colors.bodyBg).toBe("rgb(255, 251, 245)");
    expect(colors.bodyColor).toBe("rgb(26, 32, 44)");
    expect(colors.ctaBg).toBe("rgb(249, 115, 22)");

    // Hero banner SVG from public/Assets/ loads properly
    const banner = page.locator('img[alt="Conference Banner"]');
    await expect(banner).toBeVisible();
    const bannerWidth = await banner.evaluate(
      (img: HTMLImageElement) => img.naturalWidth
    );
    expect(bannerWidth).toBeGreaterThan(0);

    // Cloudinary hero video URLs & carousel URLs preserved verbatim
    const html = await page.content();
    expect(html).toContain(
      "https://res.cloudinary.com/dh87hfwml/video/upload/f_auto,q_auto/v1782834872/MetaSphere2026/988047-hd_1280_720_60fps.mp4"
    );
    expect(html).toContain(
      "https://res.cloudinary.com/dh87hfwml/image/upload/v1782834955/MetaSphere2026/Data-Visualization-thumbnail.jpg"
    );

    // Interactive Track Modal opens and closes via Escape
    await page.getByRole("button", { name: /View Tracks/i }).click();
    const modal = page.getByRole("dialog", { name: /Conference Tracks/i });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Cloud Computing & Virtualization");
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });

  test("preserves Keynote Speakers, Technical Sponsors, Registration Fees, and Program QR routes", async ({
    page,
  }) => {
    await page.goto("/speakers");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Keynote Speakers/i
    );
    await expect(page.locator("body")).toContainText(
      "Siddhartha Bhattacharyya"
    );

    await page.goto("/sponsors");
    const sponsorHtml = await page.content();
    expect(sponsorHtml).toContain(
      "https://res.cloudinary.com/dh87hfwml/image/upload/v1782834961/MetaSphere2026/Sponsors/techSponsor5.jpg"
    );

    await page.goto("/registration");
    await expect(page.locator("table")).toContainText("4000 INR/-");
    await expect(page.locator("table")).toContainText("100 USD");

    await page.goto("/technical-programs");
    const qrImg = page.locator('img[alt="QR Code for Program"]');
    await expect(qrImg).toBeVisible();
    const qrLoaded = await qrImg.evaluate(
      (img: HTMLImageElement) => img.naturalWidth > 0
    );
    expect(qrLoaded).toBe(true);

    await page.goto("/contact");
    await expect(page.locator("body")).toContainText("IEM Ashram Building");
  });

  test("Committee Directory preserves National / International #f97316 pill toggle", async ({
    page,
  }) => {
    await page.goto("/committees/advisory");
    const nationalBtn = page.locator("#nationalBtn");
    const internationalBtn = page.locator("#internationalBtn");

    await expect(nationalBtn).toBeVisible();
    await nationalBtn.click();

    await expect(nationalBtn).toHaveCSS(
      "background-color",
      "rgb(249, 115, 22)"
    );
    await expect(page.locator("#committeeTable tbody")).toContainText(
      "India (National)"
    );

    await internationalBtn.click();
    await expect(page.locator("#committeeTable tbody")).toContainText(
      "International"
    );
  });

  test("serves /2026 archived edition with archive banner and 2026 dates", async ({
    page,
  }) => {
    await page.goto("/2026");
    await expect(page.locator("header")).toContainText(
      /Viewing archived MetaSphere 2026 edition/i
    );
    await expect(page.locator("body")).toContainText("21st & 22nd August, 2026");

    await page.goto("/2026/registration");
    await expect(page.locator("header")).toContainText(
      /Viewing archived MetaSphere 2026 edition/i
    );
    await expect(page.locator("body")).toContainText("MetaSphere 2026");
  });

  test("redirects all 13 legacy .html routes with 308 permanent redirects", async ({
    request,
  }) => {
    for (const redirect of inventory.legacyRedirects) {
      const sourcePath = redirect.source.startsWith("/")
        ? redirect.source
        : `/${redirect.source}`;
      const response = await request.get(sourcePath, {
        maxRedirects: 0,
      });
      expect(
        response.status(),
        `Expected 308 permanent redirect for ${sourcePath}`
      ).toBe(308);
      const location = response.headers()["location"];
      expect(location).toBeTruthy();
      expect(location?.endsWith(redirect.destination)).toBe(true);
    }
  });
});
