import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import sitemap from "../../src/app/sitemap";
import robots from "../../src/app/robots";

describe("SEO sitemap, robots.txt & public edition snapshot routes", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  it("sitemap() includes all 13 active public routes and the /2026 archive routes", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    const expectedPaths = [
      "/",
      "/call-for-papers",
      "/paper-submission",
      "/registration",
      "/speakers",
      "/committees/advisory",
      "/committees/scientific",
      "/committees/technical",
      "/committees/aaia",
      "/technical-programs",
      "/sponsors",
      "/contact",
      "/2026",
    ];

    for (const expectedPath of expectedPaths) {
      expect(
        urls.some((u) =>
          expectedPath === "/"
            ? /^https?:\/\/[^/]+\/?$/.test(u)
            : u.endsWith(expectedPath)
        ),
        `Missing sitemap URL for ${expectedPath}`
      ).toBe(true);
    }

    expect(urls.some((u) => u.includes("/admin"))).toBe(false);
  });

  it("robots() allows public indexing and disallows /admin and /api", async () => {
    const rules = await robots();
    expect(rules.sitemap).toBeTruthy();
    const ruleList = Array.isArray(rules.rules) ? rules.rules : [rules.rules];
    const primary = ruleList[0];
    expect(primary.disallow).toEqual(
      expect.arrayContaining(["/admin", "/api"])
    );
  });
});
