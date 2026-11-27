import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUnstableCache } = vi.hoisted(() => ({
  mockUnstableCache: vi.fn((fn: () => unknown) => fn),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: mockUnstableCache,
}));

import {
  buildEventJsonLd,
  getActiveEditionYear,
  getEditionSnapshot,
} from "../../src/features/conference/queries";
import { getFallbackEditionSnapshot } from "../../src/lib/fallback/seed-snapshot";

describe("conference queries & dynamic Event JSON-LD", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    mockUnstableCache.mockClear();
  });

  it("buildEventJsonLd emits 2027 IST dates, INR offer, and IEM Ashram venue", () => {
    const edition2027 = getFallbackEditionSnapshot(2027);
    const jsonLd = buildEventJsonLd(edition2027);

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Event");
    expect(jsonLd.startDate).toBe("2027-08-17T09:00:00+05:30");
    expect(jsonLd.endDate).toBe("2027-08-18T18:00:00+05:30");
    expect(jsonLd.offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "INR",
      price: "4000",
    });
    expect(JSON.stringify(jsonLd.location)).toContain("Ashram Building");
    expect(JSON.stringify(jsonLd.location)).toContain(
      "Institute of Engineering & Management (IEM)"
    );
    expect(JSON.stringify(jsonLd.location)).toContain("700091");
  });

  it("buildEventJsonLd preserves 2026 archived dates when passed 2026 snapshot", () => {
    const edition2026 = getFallbackEditionSnapshot(2026);
    const jsonLd = buildEventJsonLd(edition2026);

    expect(jsonLd.startDate).toBe("2026-08-21T09:00:00+05:30");
    expect(jsonLd.endDate).toBe("2026-08-22T18:00:00+05:30");
    expect(String(jsonLd.name)).toContain("2026");
  });

  it("getActiveEditionYear returns 2027 cleanly when Supabase is unconfigured", async () => {
    const activeYear = await getActiveEditionYear();
    expect(activeYear).toBe(2027);
  });

  it("getEditionSnapshot falls back seamlessly for 2027 & 2026 with Cloudinary URLs intact", async () => {
    const snap2027 = await getEditionSnapshot(2027);
    const snap2026 = await getEditionSnapshot(2026);

    expect(snap2027.edition.year).toBe(2027);
    expect(snap2027.edition.status).toBe("published");
    expect(snap2027.edition.timezone).toBe("Asia/Kolkata");
    expect(snap2027.siteSettings.heroMedia.heroVideos).toEqual(
      expect.arrayContaining([
        expect.stringContaining("res.cloudinary.com/dh87hfwml/video/upload"),
      ])
    );

    expect(snap2026.edition.year).toBe(2026);
    expect(snap2026.edition.status).toBe("archived");
    expect(snap2026.tracks.length).toBeGreaterThanOrEqual(3);
  });

  it("passes edition:<year> cache tag to unstable_cache for public queries and bypasses cache for drafts", async () => {
    await getEditionSnapshot(2027);
    expect(mockUnstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["edition-snapshot", "2027"],
      expect.objectContaining({ tags: ["edition:2027"] })
    );

    mockUnstableCache.mockClear();
    await getEditionSnapshot(2027, { includeDrafts: true });
    expect(mockUnstableCache).not.toHaveBeenCalled();
  });
});
