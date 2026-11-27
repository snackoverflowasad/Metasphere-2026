import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = path.resolve(__dirname, "../..");
const INVENTORY_PATH = path.join(ROOT_DIR, "docs/migration/legacy-inventory.json");

const EXPECTED_REDIRECTS = [
  { source: "index.html", destination: "/" },
  { source: "CallPapers.html", destination: "/call-for-papers" },
  { source: "PaperSubmit.html", destination: "/paper-submission" },
  { source: "registration.html", destination: "/registration" },
  { source: "Keynote_Speaker.html", destination: "/speakers" },
  { source: "technical-programs.html", destination: "/technical-programs" },
  { source: "TechSponsor.html", destination: "/sponsors" },
  { source: "Contact.html", destination: "/contact" },
  { source: "AdvisoryCommittee.html", destination: "/committees/advisory" },
  { source: "scientific-committee.html", destination: "/committees/scientific" },
  { source: "TechCommittee.html", destination: "/committees/technical" },
  { source: "AAIA.html", destination: "/committees/aaia" },
  { source: "404.html", destination: "/404" },
];

const EXPECTED_THEME_TOKENS = {
  background: "#fffbf5",
  foreground: "#1a202c",
  primary: "#f97316",
  primaryHover: "#ea580c",
  accentMagenta: "#d946ef",
};

function loadInventory() {
  expect(fs.existsSync(INVENTORY_PATH)).toBe(true);
  const raw = fs.readFileSync(INVENTORY_PATH, "utf8");
  return JSON.parse(raw);
}

function collectCloudinaryUrlsFromSeed(): string[] {
  const urls = new Set<string>();
  const regex = /https:\/\/res\.cloudinary\.com\/dh87hfwml\/[^"'\s<>`]+/g;
  const seedSql = fs.readFileSync(
    path.join(ROOT_DIR, "supabase/seed.sql"),
    "utf8"
  );
  const matches = seedSql.match(regex) ?? [];
  for (const url of matches) {
    urls.add(url);
  }
  return Array.from(urls).sort();
}

describe("Legacy 2026 Preservation Manifest", () => {
  it("contains all 13 legacy HTML to Next.js route redirects", () => {
    const inventory = loadInventory();
    expect(Array.isArray(inventory.legacyRedirects)).toBe(true);
    expect(inventory.legacyRedirects).toHaveLength(13);
    expect(inventory.legacyRedirects).toEqual(EXPECTED_REDIRECTS);
    expect(fs.existsSync(path.join(ROOT_DIR, "next.config.ts"))).toBe(true);
  });

  it("preserves all >= 35 unique Cloudinary media URLs in supabase/seed.sql", () => {
    const inventory = loadInventory();
    const seedCloudinaryUrls = collectCloudinaryUrlsFromSeed();

    expect(Array.isArray(inventory.cloudinaryUrls)).toBe(true);
    expect(inventory.cloudinaryUrls.length).toBeGreaterThanOrEqual(35);
    expect(seedCloudinaryUrls.length).toBeGreaterThanOrEqual(35);

    const uniqueInventoryUrls = Array.from(new Set(inventory.cloudinaryUrls)).sort();
    expect(uniqueInventoryUrls).toEqual(seedCloudinaryUrls);
  });

  it("locks exact legacy theme hex tokens", () => {
    const inventory = loadInventory();
    expect(inventory.themeTokens).toEqual(EXPECTED_THEME_TOKENS);
  });

  it("captures all localAssets in public/ including exact casing and spaces", () => {
    const inventory = loadInventory();
    expect(Array.isArray(inventory.localAssets)).toBe(true);
    expect(inventory.localAssets).toContain("Assets/METASPHERE WEBSITE BANNER .svg");
    expect(inventory.localAssets).toContain("Assets/Logo.svg");
    expect(inventory.localAssets).toContain("Assets/Logo.png");
    expect(inventory.localAssets).toContain("Assets/book.png");
    expect(inventory.localAssets).toContain("Assets/keynote-speakers/speaker-1.png");
    expect(inventory.localAssets).toContain("Assets/keynote-speakers/speaker-6.jpg");

    for (const assetPath of inventory.localAssets) {
      expect(fs.existsSync(path.join(ROOT_DIR, "public", assetPath))).toBe(true);
    }
    expect(fs.existsSync(path.join(ROOT_DIR, "public/favicon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT_DIR, "public/favicon.svg"))).toBe(true);
  });

  it("captures externalLinks for CMT, Forms, Overleaf, Google Drive, and Google Maps", () => {
    const inventory = loadInventory();
    expect(inventory.externalLinks).toBeDefined();
    expect(inventory.externalLinks.cmtPortal).toBe(
      "https://cmt3.research.microsoft.com/MetaSphere2026"
    );
    expect(inventory.externalLinks.registrationForm).toContain(
      "https://forms.cloud.microsoft/pages/responsepage.aspx"
    );
    expect(inventory.externalLinks.latexOverleafTemplate).toBe(
      "https://www.overleaf.com/latex/templates/springer-lecture-notes-in-computer-science/kzwwpvhwnvfj"
    );
    expect(Array.isArray(inventory.externalLinks.googleDrive)).toBe(true);
    expect(inventory.externalLinks.googleDrive.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(inventory.externalLinks.googleMapsEmbeds)).toBe(true);
    expect(inventory.externalLinks.googleMapsEmbeds.length).toBeGreaterThanOrEqual(2);
  });

  it("captures structured edition2026Content without missing core sections", () => {
    const inventory = loadInventory();
    const content = inventory.edition2026Content;
    expect(content).toBeDefined();

    expect(content.conference?.title).toContain("MetaSphere 2026");
    expect(content.deadlines?.length).toBeGreaterThanOrEqual(6);
    expect(content.tracks?.length).toBe(3);
    expect(content.keynoteSpeakers?.length).toBe(6);
    expect(content.sponsors?.length).toBe(5);

    expect(content.committees?.leadershipGroups?.length).toBeGreaterThanOrEqual(3);
    expect(content.committees?.chairGroups?.length).toBeGreaterThanOrEqual(10);
    expect(content.committees?.organizingCommittee?.length).toBeGreaterThanOrEqual(25);
    expect(content.committees?.advisoryCommittee?.length).toBeGreaterThanOrEqual(35);
    expect(content.committees?.technicalProgramCommittee?.length).toBeGreaterThanOrEqual(65);
    expect(content.committees?.aaiaCommittee?.length).toBeGreaterThanOrEqual(25);

    expect(content.registrationFees?.categories?.length).toBe(5);
    expect(content.registrationFees?.bankTransfer?.accountNo).toBe("164201000000488");
    expect(content.registrationFees?.bankTransfer?.ifscCode).toBe("IOBA0001642");
    expect(content.contact?.emails).toContain("metaSphere2026@iem.edu.in");
  });
});
