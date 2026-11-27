import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig, { legacyHtmlRedirects } from "../../next.config";
import {
  buildNoStoreHeaders,
  buildSecurityHeaders,
} from "../../src/lib/security/headers";

const ROOT_DIR = path.resolve(__dirname, "../..");
const INVENTORY_PATH = path.join(ROOT_DIR, "docs/migration/legacy-inventory.json");

interface InventoryRedirect {
  source: string;
  destination: string;
}

function loadLegacyRedirects(): InventoryRedirect[] {
  const raw = fs.readFileSync(INVENTORY_PATH, "utf8");
  const parsed = JSON.parse(raw) as { legacyRedirects: InventoryRedirect[] };
  return parsed.legacyRedirects;
}

describe("Next.js Config, Legacy Redirects & Security Headers", () => {
  it("defines permanent (308) redirects for all 13 legacy .html routes", async () => {
    const inventoryRedirects = loadLegacyRedirects();
    expect(inventoryRedirects).toHaveLength(13);

    const redirects = await legacyHtmlRedirects();
    expect(redirects).toHaveLength(13);

    for (const entry of inventoryRedirects) {
      const expectedSource = entry.source.startsWith("/")
        ? entry.source
        : `/${entry.source}`;

      const match = redirects.find((r) => r.source === expectedSource);
      expect(match, `Missing redirect for ${expectedSource}`).toBeDefined();
      expect(match?.destination).toBe(entry.destination);
      expect(match?.permanent).toBe(true);
    }

    expect(typeof nextConfig.redirects).toBe("function");
    const configRedirects = await nextConfig.redirects!();
    expect(configRedirects).toEqual(redirects);
  });

  it("allows res.cloudinary.com and *.supabase.co in images.remotePatterns", () => {
    const patterns = nextConfig.images?.remotePatterns;
    expect(Array.isArray(patterns)).toBe(true);

    const hostnames = (patterns ?? []).map((p) => p.hostname);
    expect(hostnames).toContain("res.cloudinary.com");
    expect(hostnames).toContain("*.supabase.co");
  });

  it("configures CSP allowing https://res.cloudinary.com and X-Frame-Options: DENY", () => {
    const headers = buildSecurityHeaders();
    const byKey = new Map(headers.map((h) => [h.key.toLowerCase(), h.value]));

    expect(byKey.get("x-frame-options")).toBe("DENY");
    expect(byKey.get("x-content-type-options")).toBe("nosniff");
    expect(byKey.get("referrer-policy")).toBe("strict-origin-when-cross-origin");

    const csp = byKey.get("content-security-policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("https://res.cloudinary.com");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("wires security headers into nextConfig.headers()", async () => {
    expect(typeof nextConfig.headers).toBe("function");
    const headerRules = await nextConfig.headers!();
    expect(headerRules.length).toBeGreaterThanOrEqual(1);
    const rootRule = headerRules.find((r) => r.source === "/(.*)");
    expect(rootRule).toBeDefined();
    expect(rootRule?.headers).toEqual(buildSecurityHeaders());

    const adminRule = headerRules.find((r) => r.source === "/admin/:path*");
    expect(adminRule?.headers).toEqual(buildNoStoreHeaders());
    const apiRule = headerRules.find((r) => r.source === "/api/:path*");
    expect(apiRule?.headers).toEqual(buildNoStoreHeaders());
  });
});
