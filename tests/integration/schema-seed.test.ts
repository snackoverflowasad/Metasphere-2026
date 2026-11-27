import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import inventory from "../../docs/migration/legacy-inventory.json";
import { getFallbackEditionSnapshot } from "../../src/lib/fallback/seed-snapshot";
import type {
  AdminRole,
  CommitteeCategory,
  ConferenceFormat,
  Database,
  EditionSnapshot,
  PublicationStatus,
} from "../../src/types/database";

type _AssertSupabaseClient = SupabaseClient<Database>;
type _AssertTypes = [
  PublicationStatus,
  AdminRole,
  ConferenceFormat,
  CommitteeCategory,
  EditionSnapshot,
];

const ROOT_DIR = path.resolve(__dirname, "../..");

const REQUIRED_TABLES = [
  "conference_editions",
  "site_settings",
  "deadlines",
  "tracks",
  "people",
  "speakers",
  "committees",
  "committee_members",
  "sponsors",
  "program_sessions",
  "resources",
  "conference_links",
  "registration_fees",
  "admin_roles",
  "audit_logs",
  "content_versions",
] as const;

describe("PostgreSQL multi-edition schema, seed & fallback snapshot", () => {
  it("defines supabase/config.toml with invite-only auth and TOTP MFA enabled", () => {
    const configPath = path.join(ROOT_DIR, "supabase/config.toml");
    expect(fs.existsSync(configPath)).toBe(true);
    const config = fs.readFileSync(configPath, "utf8");
    expect(config).toContain("project_id");
    expect(config).toMatch(/enable_signup\s*=\s*false/);
    expect(config).toContain("[auth.mfa.totp]");
    expect(config).toMatch(/enroll_enabled\s*=\s*true/);
    expect(config).toMatch(/verify_enabled\s*=\s*true/);
  });

  it("defines all 16 tables, enums, timestamptz, Asia/Kolkata, INR/USD columns, and single-active index in 0001 and 0002", () => {
    const migration0001Path = path.join(
      ROOT_DIR,
      "supabase/migrations/0001_core_editions_and_cms.sql"
    );
    const migration0002Path = path.join(
      ROOT_DIR,
      "supabase/migrations/0002_admin_rbac_and_audit.sql"
    );

    expect(fs.existsSync(migration0001Path)).toBe(true);
    expect(fs.existsSync(migration0002Path)).toBe(true);

    const sql0001 = fs.readFileSync(migration0001Path, "utf8");
    const sql0002 = fs.readFileSync(migration0002Path, "utf8");
    const combinedSql = `${sql0001}\n${sql0002}`;

    for (const table of REQUIRED_TABLES) {
      expect(combinedSql).toMatch(
        new RegExp(`CREATE TABLE(?: IF NOT EXISTS)?\\s+public\\.${table}\\b`, "i")
      );
    }

    expect(sql0001).toMatch(
      /CREATE TYPE\s+public\.publication_status\s+AS\s+ENUM\s*\(\s*'draft'\s*,\s*'published'\s*,\s*'archived'\s*\)/i
    );
    expect(sql0001).toMatch(/timezone\s+text\s+NOT\s+NULL\s+DEFAULT\s+'Asia\/Kolkata'/i);
    expect(sql0001).toMatch(/start_date\s+timestamptz\s+NOT\s+NULL/i);
    expect(sql0001).toMatch(/end_date\s+timestamptz\s+NOT\s+NULL/i);
    expect(sql0001).toMatch(/due_at\s+timestamptz\s+NOT\s+NULL/i);
    expect(sql0001).toMatch(/amount_inr\s+integer/i);
    expect(sql0001).toMatch(/amount_usd\s+integer/i);
    expect(sql0001).toMatch(
      /CREATE UNIQUE INDEX(?: IF NOT EXISTS)?\s+\w+\s+ON\s+public\.conference_editions\s*\(\s*is_active\s*\)\s+WHERE\s+is_active\s*=\s*true/i
    );

    expect(sql0002).toMatch(
      /CREATE TYPE\s+public\.admin_role\s+AS\s+ENUM\s*\(\s*'super_admin'\s*,\s*'content_admin'\s*,\s*'editor'\s*\)/i
    );
    expect(sql0002).toMatch(/can_approve_financial\s+boolean\s+NOT\s+NULL\s+DEFAULT\s+false/i);
  });

  it("seeds both 2026 archived and 2027 active editions and preserves all 36 Cloudinary URLs and 22 local Assets verbatim", () => {
    const seedPath = path.join(ROOT_DIR, "supabase/seed.sql");
    expect(fs.existsSync(seedPath)).toBe(true);
    const seed = fs.readFileSync(seedPath, "utf8");

    expect(seed).toContain("2026");
    expect(seed).toContain("'archived'");
    expect(seed).toContain("2026-08-21T09:00:00+05:30");
    expect(seed).toContain("2026-08-22T18:00:00+05:30");

    expect(seed).toContain("2027");
    expect(seed).toContain("'published'");
    expect(seed).toContain("2027-08-17T09:00:00+05:30");
    expect(seed).toContain("2027-08-18T18:00:00+05:30");
    expect(seed).toContain("'Asia/Kolkata'");

    for (const url of inventory.cloudinaryUrls) {
      expect(seed).toContain(url);
    }

    for (const assetPath of inventory.localAssets) {
      expect(seed).toContain(assetPath);
    }

    for (const speaker of inventory.edition2026Content.keynoteSpeakers) {
      expect(seed).toContain(speaker.name);
    }

    for (const sponsor of inventory.edition2026Content.sponsors) {
      expect(seed).toContain(sponsor.logoUrl);
    }

    expect(seed).toContain(inventory.externalLinks.cmtPortal);
    expect(seed).toContain(inventory.externalLinks.registrationForm);
    expect(seed).toContain(inventory.externalLinks.latexOverleafTemplate);
  });

  it("provides typed fallback snapshots for 2026 (archived) and 2027 (active) with full media, speakers, committees, sponsors, tracks, deadlines, and INR/USD fees", () => {
    const active = getFallbackEditionSnapshot();
    const edition2027 = getFallbackEditionSnapshot(2027);
    const edition2026 = getFallbackEditionSnapshot(2026);

    expect(active.edition.year).toBe(2027);
    expect(edition2027.edition.year).toBe(2027);
    expect(edition2027.edition.status).toBe("published");
    expect(edition2027.edition.isActive).toBe(true);
    expect(edition2027.edition.timezone).toBe("Asia/Kolkata");
    expect(edition2027.edition.startDate).toBe("2027-08-17T09:00:00+05:30");
    expect(edition2027.edition.endDate).toBe("2027-08-18T18:00:00+05:30");

    expect(edition2026.edition.year).toBe(2026);
    expect(edition2026.edition.status).toBe("archived");
    expect(edition2026.edition.isActive).toBe(false);
    expect(edition2026.edition.timezone).toBe("Asia/Kolkata");
    expect(edition2026.edition.startDate).toBe("2026-08-21T09:00:00+05:30");
    expect(edition2026.edition.endDate).toBe("2026-08-22T18:00:00+05:30");

    for (const snapshot of [edition2026, edition2027]) {
      expect(snapshot.siteSettings.themeTokens).toEqual(inventory.themeTokens);
      expect(snapshot.speakers).toHaveLength(6);
      expect(snapshot.sponsors).toHaveLength(5);
      expect(snapshot.tracks.length).toBeGreaterThanOrEqual(3);
      expect(snapshot.deadlines.length).toBeGreaterThanOrEqual(6);
      expect(snapshot.registrationFees).toHaveLength(5);
      expect(snapshot.registrationFees[0].amountInr).toBe(4000);
      expect(snapshot.registrationFees[0].amountUsd).toBe(100);

      expect(snapshot.committees.map((c) => c.category)).toEqual(
        expect.arrayContaining([
          "scientific",
          "organizing",
          "advisory",
          "technical",
          "aaia",
        ])
      );

      const serialized = JSON.stringify(snapshot);
      for (const url of inventory.cloudinaryUrls) {
        expect(serialized).toContain(url);
      }
      for (const assetPath of inventory.localAssets) {
        expect(serialized).toContain(assetPath);
      }
    }

    expect(() => getFallbackEditionSnapshot(2099)).toThrow();
  });

  it("classifies Bhusawal Indian affiliations (Dr. Priti Subramanium, Dr. Gajanan Uttam Patil) as India/national rather than international", () => {
    const seed = fs.readFileSync(path.join(ROOT_DIR, "supabase/seed.sql"), "utf8");
    expect(seed).toContain(
      "'Dr. Priti Subramanium', NULL, 'Shri Sant Gadge Baba College of Engineering and Technology, Bhusawal, India', 'India'"
    );
    expect(seed).toContain(
      "'Dr. Gajanan Uttam Patil', NULL, 'HSM’S SSGBCOE&T, Bhusawal, India', 'India'"
    );
    expect(seed).toContain(
      "'10000000-0000-4000-8000-000000000087', 'TPC Member', 'Technical Program Committee', 'national'"
    );
    expect(seed).toContain(
      "'10000000-0000-4000-8000-0000000000aa', 'TPC Member', 'Technical Program Committee', 'national'"
    );

    for (const year of [2026, 2027]) {
      const snapshot = getFallbackEditionSnapshot(year);
      expect(snapshot.speakers.every((s) => s.country === "India" || s.country === "International")).toBe(true);
      const tpc = snapshot.committees.find((c) => c.category === "technical");
      expect(tpc).toBeDefined();

      const priti = tpc!.members.find((m) => m.fullName === "Dr. Priti Subramanium");
      const gajanan = tpc!.members.find((m) => m.fullName === "Dr. Gajanan Uttam Patil");
      expect(priti?.nationalityGroup).toBe("national");
      expect(gajanan?.nationalityGroup).toBe("national");
    }
  });
});
