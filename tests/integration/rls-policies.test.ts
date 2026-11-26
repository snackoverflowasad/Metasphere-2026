import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = path.resolve(__dirname, "../..");
const MIGRATION_0003_PATH = path.join(
  ROOT_DIR,
  "supabase/migrations/0003_rls_policies_and_aal2.sql"
);
const MIGRATION_0004_PATH = path.join(
  ROOT_DIR,
  "supabase/migrations/0004_storage_buckets_and_policies.sql"
);
const HANDOFF_DOC_PATH = path.join(
  ROOT_DIR,
  "docs/operations/supabase-handoff.md"
);

const ALL_16_TABLES = [
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

const PUBLIC_STATUS_TABLES = [
  "conference_editions",
  "site_settings",
  "deadlines",
  "tracks",
  "speakers",
  "committees",
  "committee_members",
  "sponsors",
  "program_sessions",
  "resources",
  "conference_links",
  "registration_fees",
] as const;

const ADMIN_ONLY_TABLES = [
  "admin_roles",
  "audit_logs",
  "content_versions",
] as const;

function readSql0003(): string {
  expect(fs.existsSync(MIGRATION_0003_PATH)).toBe(true);
  return fs.readFileSync(MIGRATION_0003_PATH, "utf8");
}

function readSql0004(): string {
  expect(fs.existsSync(MIGRATION_0004_PATH)).toBe(true);
  return fs.readFileSync(MIGRATION_0004_PATH, "utf8");
}

function extractPolicyStatements(sql: string, tableName: string): string[] {
  const regex = new RegExp(
    `CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+public\\.${tableName}\\b[\\s\\S]*?;`,
    "gi"
  );
  return sql.match(regex) ?? [];
}

function extractTablePolicies(sql: string, tableName: string): string {
  return extractPolicyStatements(sql, tableName).join("\n");
}

describe("0003 RLS policies & mandatory AAL2 MFA enforcement", () => {
  it("defines SECURITY DEFINER helper functions current_admin_role() and can_approve_financial()", () => {
    const sql = readSql0003();

    expect(sql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.current_admin_role\s*\(\s*\)\s+RETURNS\s+text[\s\S]*?SECURITY\s+DEFINER[\s\S]*?SET\s+search_path\s*=\s*public/i
    );
    expect(sql).toMatch(/FROM\s+public\.admin_roles\b[\s\S]*?is_active\s*=\s*true/i);

    expect(sql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.can_approve_financial\s*\(\s*\)\s+RETURNS\s+boolean[\s\S]*?SECURITY\s+DEFINER[\s\S]*?SET\s+search_path\s*=\s*public/i
    );
    expect(sql).toMatch(/can_approve_financial\s*=\s*true/i);
  });

  it("enables ROW LEVEL SECURITY on all 16 tables from 0001 and 0002", () => {
    const sql = readSql0003();

    for (const table of ALL_16_TABLES) {
      expect(sql).toMatch(
        new RegExp(
          `ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY\\s*;`,
          "i"
        )
      );
    }
  });

  it("enforces AS RESTRICTIVE aal2 MFA check on all 16 tables", () => {
    const sql = readSql0003();

    for (const table of ALL_16_TABLES) {
      const policies = extractTablePolicies(sql, table);
      expect(policies.length).toBeGreaterThan(0);
      expect(policies).toMatch(/AS\s+RESTRICTIVE/i);
      expect(policies).toMatch(
        /\(\s*select\s+auth\.jwt\(\)\s*->>\s*'aal'\s*\)\s*=\s*'aal2'/i
      );
    }
  });

  it("allows anon/public SELECT only for published/archived rows on public status tables and hides drafts", () => {
    const sql = readSql0003();

    for (const table of PUBLIC_STATUS_TABLES) {
      const statements = extractPolicyStatements(sql, table);
      const policies = statements.join("\n");
      expect(policies).toMatch(
        /FOR\s+SELECT[\s\S]*?TO\s+(?:anon,\s*authenticated|public)[\s\S]*?status\s+IN\s*\(\s*'published'\s*,\s*'archived'\s*\)/i
      );
      for (const stmt of statements) {
        if (/\bFOR\s+(?:INSERT|UPDATE|DELETE|ALL)\b/i.test(stmt)) {
          expect(stmt).not.toMatch(/\bTO\s+(?:anon|public)\b/i);
        }
      }
    }

    const peoplePolicies = extractTablePolicies(sql, "people");
    expect(peoplePolicies).toMatch(/FOR\s+SELECT[\s\S]*?TO\s+anon,\s*authenticated/i);
    expect(peoplePolicies).toMatch(/public\.speakers/i);
    expect(peoplePolicies).toMatch(/public\.committee_members/i);
    expect(peoplePolicies).toMatch(/status\s+IN\s*\(\s*'published'\s*,\s*'archived'\s*\)/i);
  });

  it("keeps admin_roles, audit_logs, and content_versions strictly admin-only with no anon policies", () => {
    const sql = readSql0003();

    for (const table of ADMIN_ONLY_TABLES) {
      const policies = extractTablePolicies(sql, table);
      expect(policies).not.toMatch(/\bTO\s+anon\b/i);
      expect(policies).not.toMatch(/\bTO\s+public\b/i);
      expect(policies).toMatch(/AS\s+RESTRICTIVE[\s\S]*?auth\.jwt\(\)\s*->>\s*'aal'[\s\S]*?'aal2'/i);
    }
  });

  it("restricts editor to draft writes, blocks editor publishing, and gates registration_fees publishing with can_approve_financial()", () => {
    const sql = readSql0003();

    for (const table of PUBLIC_STATUS_TABLES) {
      const policies = extractTablePolicies(sql, table);
      // Editor can only insert/update draft rows (status = 'draft')
      expect(policies).toMatch(/'editor'[\s\S]*?status\s*=\s*'draft'/i);
      // Publishing ('published', 'archived') requires content_admin or super_admin
      expect(policies).toMatch(/'super_admin'[\s\S]*?'content_admin'/i);
    }

    const feePolicies = extractTablePolicies(sql, "registration_fees");
    expect(feePolicies).toMatch(/public\.can_approve_financial\(\)/i);
    expect(feePolicies).toMatch(/'super_admin'/i);
    expect(feePolicies).toMatch(/'content_admin'/i);

    const adminRolesPolicies = extractTablePolicies(sql, "admin_roles");
    expect(adminRolesPolicies).toMatch(
      /FOR\s+INSERT[\s\S]*?public\.current_admin_role\(\)\s*=\s*'super_admin'/i
    );
    expect(adminRolesPolicies).toMatch(
      /FOR\s+UPDATE[\s\S]*?public\.current_admin_role\(\)\s*=\s*'super_admin'/i
    );
    expect(adminRolesPolicies).toMatch(
      /FOR\s+DELETE[\s\S]*?public\.current_admin_role\(\)\s*=\s*'super_admin'/i
    );
  });

  it("keeps audit_logs strictly append-only with SELECT and INSERT policies, actor attribution check, and zero UPDATE or DELETE policies", () => {
    const sql = readSql0003();
    const auditPolicies = extractTablePolicies(sql, "audit_logs");

    expect(auditPolicies).toMatch(/FOR\s+SELECT/i);
    expect(auditPolicies).toMatch(/FOR\s+INSERT/i);
    expect(auditPolicies).toMatch(/actor_id\s+IS\s+NULL\s+OR\s+actor_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)/i);
    expect(auditPolicies).not.toMatch(/FOR\s+UPDATE/i);
    expect(auditPolicies).not.toMatch(/FOR\s+DELETE/i);
    expect(auditPolicies).not.toMatch(/FOR\s+ALL[\s\S]*?PERMISSIVE/i);

    const versionPolicies = extractTablePolicies(sql, "content_versions");
    expect(versionPolicies).toMatch(/created_by\s+IS\s+NULL\s+OR\s+created_by\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)/i);
  });
});

describe("0004 storage buckets & safe MIME policies", () => {
  it("creates conference-public and conference-private buckets with 10 MB limit and safe MIME allowlist", () => {
    const sql = readSql0004();

    expect(sql).toContain("'conference-public'");
    expect(sql).toContain("'conference-private'");
    expect(sql).toMatch(/10485760/);
    expect(sql).toContain("'image/png'");
    expect(sql).toContain("'image/jpeg'");
    expect(sql).toContain("'image/webp'");
    expect(sql).toContain("'application/pdf'");
  });

  it("enforces per-command restrictive storage.objects RLS blocking image/svg+xml and text/html while tolerating metadata IS NULL on INSERT", () => {
    const sql = readSql0004();

    expect(sql).toMatch(/ON\s+storage\.objects\b/i);
    expect(sql).toMatch(/AS\s+RESTRICTIVE\s+FOR\s+SELECT/i);
    expect(sql).toMatch(/AS\s+RESTRICTIVE\s+FOR\s+INSERT/i);
    expect(sql).toMatch(/AS\s+RESTRICTIVE\s+FOR\s+UPDATE/i);
    expect(sql).toMatch(/AS\s+RESTRICTIVE\s+FOR\s+DELETE/i);
    expect(sql).not.toMatch(/AS\s+RESTRICTIVE\s+FOR\s+ALL/i);
    expect(sql).toMatch(
      /\(\s*select\s+auth\.jwt\(\)\s*->>\s*'aal'\s*\)\s*=\s*'aal2'/i
    );
    expect(sql).toMatch(/public\.current_admin_role\(\)\s+IN\s*\(\s*'super_admin'\s*,\s*'content_admin'\s*,\s*'editor'\s*\)/i);
    expect(sql).toContain("'image/svg+xml'");
    expect(sql).toContain("'text/html'");
    expect(sql).toMatch(/NOT\s+IN\s*\(\s*'image\/svg\+xml'\s*,\s*'text\/html'\s*\)/i);
    expect(sql).toMatch(/metadata\s+IS\s+NULL\s+OR\s+metadata->>'mimetype'\s+IS\s+NULL/i);
    expect(sql).toMatch(/btrim\(name\)\s*!~\*\s*'\\\.\(svg\|html\?\|xhtml\)\$'/i);
  });
});

describe("docs/operations/supabase-handoff.md", () => {
  it("documents project setup, modern Supabase keys, migration push, seed, super_admin creation, and TOTP MFA enrollment", () => {
    expect(fs.existsSync(HANDOFF_DOC_PATH)).toBe(true);
    const doc = fs.readFileSync(HANDOFF_DOC_PATH, "utf8");

    expect(doc).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(doc).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(doc).toContain("SUPABASE_SECRET_KEY");

    expect(doc).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(doc).not.toContain("SUPABASE_SERVICE_ROLE_KEY");

    expect(doc).toContain("supabase link");
    expect(doc).toContain("supabase db push");
    expect(doc).toContain("seed.sql");
    expect(doc).toContain("admin_roles");
    expect(doc).toContain("super_admin");
    expect(doc).toMatch(/TOTP|MFA|aal2/i);
  });
});
