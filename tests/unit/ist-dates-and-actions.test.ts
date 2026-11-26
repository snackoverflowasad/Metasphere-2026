import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRevalidateTag,
  mockRequireAdminSession,
  mockCreateServerSupabase,
  mockDraftModeEnable,
  mockDraftModeDisable,
} = vi.hoisted(() => ({
  mockRevalidateTag: vi.fn(),
  mockRequireAdminSession: vi.fn(),
  mockCreateServerSupabase: vi.fn(),
  mockDraftModeEnable: vi.fn(),
  mockDraftModeDisable: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidateTag: mockRevalidateTag,
}));
vi.mock("next/headers", () => ({
  draftMode: vi.fn(async () => ({
    enable: mockDraftModeEnable,
    disable: mockDraftModeDisable,
  })),
}));
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    requireAdminSession: mockRequireAdminSession,
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: mockCreateServerSupabase,
}));

import {
  formatIstDate,
  formatIstDateTime,
  fromIstDateTimeLocalValue,
  getCountdownParts,
  toIstDateTimeLocalValue,
} from "@/lib/dates/ist";
import { editionCacheTag, revalidateEdition } from "@/lib/cache/tags";
import {
  publishContentAction,
  updateEditionSettingsAction,
} from "@/features/conference/actions";
import { updateEditionSettingsSchema } from "@/features/conference/schemas";
import {
  deleteDeadlineAction,
  upsertDeadlineAction,
} from "@/features/deadlines/actions";
import { deadlineInputSchema } from "@/features/deadlines/schemas";
import {
  upsertConferenceLinkAction,
  upsertResourceAction,
} from "@/features/resources/actions";
import {
  conferenceLinkSchema,
  resourceInputSchema,
} from "@/features/resources/schemas";
import { AdminAuthError } from "@/lib/auth/session";
import { GET as previewGet } from "@/app/api/preview/route";

const ORIGINAL_ENV = { ...process.env };

function buildValidEditionSettingsInput() {
  return {
    editionYear: 2027,
    title: "MetaSphere 2027: Global Conference on Cloud Computing, Virtualization & Metaverse",
    subtitle: "MetaSphere 2027",
    tagline: "International Conference on Cloud Computing, Virtualization & Metaverse",
    loaderSubtitle: "IEM Kolkata • August 17–18, 2027",
    datesDisplay: "17th & 18th August, 2027",
    startDate: "2027-08-17T09:00:00+05:30",
    endDate: "2027-08-18T18:00:00+05:30",
    timezone: "Asia/Kolkata" as const,
    venueName: "IEM Ashram Building",
    venueAddress: "GN-34/2, Sector V, Salt Lake, Kolkata 700091",
    venueCity: "Kolkata",
    format: "hybrid" as const,
    description: "Premier global forum on Cloud Computing, Virtualization & Metaverse.",
    technicalCoSponsorsSummary: "IEEE & Partner Societies",
    cmtAcknowledgment: "Microsoft CMT service was used for managing peer-reviewing.",
    publicationNote: "Accepted papers will be submitted for indexed proceedings.",
    contactEmails: ["metasphere@iem.edu.in"],
    contactPhones: ["+91-33-2357-2995"],
    canonicalUrl: "https://metasphere2027.iem.edu.in",
    seoTitle: "MetaSphere 2027 | IEM Kolkata",
    seoDescription: "Official conference website for MetaSphere 2027.",
    isActive: true,
  };
}

describe("IST date formatting and countdown helpers", () => {
  it("formats UTC and +05:30 timestamps explicitly in Asia/Kolkata with IST (UTC+5:30)", () => {
    const fromUtc = formatIstDateTime("2027-08-17T03:30:00Z");
    const fromIst = formatIstDateTime("2027-08-17T09:00:00+05:30");

    expect(fromUtc).toBe(fromIst);
    expect(fromUtc).toContain("IST (UTC+5:30)");
    expect(fromUtc).toMatch(/17\s+Aug\s+2027/);
    expect(fromUtc).toMatch(/09:00/);
  });

  it("shifts date boundaries correctly into Asia/Kolkata in formatIstDate", () => {
    // 2027-08-16T20:00:00Z is 2027-08-17T01:30:00+05:30 in IST
    const formatted = formatIstDate("2027-08-16T20:00:00Z");
    expect(formatted).toMatch(/17\s+Aug\s+2027/);
  });

  it("computes remaining days, hours, minutes, seconds and flips isLive at target time", () => {
    const targetIso = "2027-08-17T09:00:00+05:30";
    const targetMs = Date.parse(targetIso);
    const deltaMs = ((2 * 86400) + (3 * 3600) + (15 * 60) + 42) * 1000;

    expect(getCountdownParts(targetIso, targetMs - deltaMs)).toEqual({
      days: 2,
      hours: 3,
      minutes: 15,
      seconds: 42,
      isLive: false,
    });

    expect(getCountdownParts(targetIso, targetMs)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isLive: true,
    });

    expect(getCountdownParts(targetIso, targetMs + 60_000)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isLive: true,
    });
  });
});

describe("edition cache tag helpers", () => {
  beforeEach(() => {
    mockRevalidateTag.mockReset();
  });

  it("builds edition:<year> tag and calls Next.js 16 2-argument revalidateTag", () => {
    expect(editionCacheTag(2027)).toBe("edition:2027");
    expect(editionCacheTag(2026)).toBe("edition:2026");

    revalidateEdition(2027);
    expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
    expect(mockRevalidateTag).toHaveBeenCalledWith("edition:2027", {
      expire: 0,
    });
  });

  it("round-trips toIstDateTimeLocalValue and fromIstDateTimeLocalValue in Asia/Kolkata", () => {
    // 2027-08-17T03:30:00Z === 2027-08-17T09:00:00+05:30
    const localInput = toIstDateTimeLocalValue("2027-08-17T03:30:00Z");
    expect(localInput).toBe("2027-08-17T09:00");

    const isoIst = fromIstDateTimeLocalValue(localInput);
    expect(isoIst).toBe("2027-08-17T09:00:00+05:30");
    expect(Date.parse(isoIst)).toBe(Date.parse("2027-08-17T03:30:00Z"));
  });

  it("enforces UUID editionId and validates resourceInputSchema", () => {
    expect(
      deadlineInputSchema.safeParse({
        editionId: "fallback-edition-2027",
        editionYear: 2027,
        title: "Full paper submission",
        dueAt: "2027-05-31T23:59:59+05:30",
        displayDate: "31st May, 2027",
        originalDate: null,
        isExtended: false,
        isConferenceDate: false,
        sortOrder: 1,
        isVisible: true,
        status: "draft",
      }).success
    ).toBe(false);

    expect(
      resourceInputSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        label: "LaTeX Template",
        category: "template",
        url: "https://www.overleaf.com/latex/templates/springer",
        storagePath: null,
        sortOrder: 1,
        status: "draft",
      }).success
    ).toBe(true);

    expect(
      resourceInputSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        label: "Bad Resource",
        category: "template",
        url: "javascript:alert(1)",
        storagePath: null,
        sortOrder: 1,
        status: "draft",
      }).success
    ).toBe(false);

    expect(
      resourceInputSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        label: "Missing Target",
        category: "template",
        url: "",
        storagePath: "",
        sortOrder: 1,
        status: "draft",
      }).success
    ).toBe(false);
  });

  it("enforces edition ownership on deadline updates and supports deleteDeadlineAction + upsertResourceAction", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    mockRequireAdminSession.mockResolvedValue({
      userId: "user-editor-1",
      email: "editor@iem.edu.in",
      displayName: "Editor",
      role: "editor",
      canApproveFinancial: false,
      aal: "aal2",
    });

    const insertAudit = vi.fn().mockResolvedValue({ error: null });
    const insertVersion = vi.fn().mockResolvedValue({ error: null });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });

    const mismatchRow = {
      id: "33333333-3333-4333-8333-333333333333",
      edition_id: "99999999-9999-4999-8999-999999999999",
      status: "draft",
    };

    mockCreateServerSupabase.mockResolvedValueOnce({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: mismatchRow, error: null }),
          }),
        }),
      }),
    });

    const mismatchRes = await upsertDeadlineAction({
      id: "33333333-3333-4333-8333-333333333333",
      editionId: "11111111-1111-4111-8111-111111111111",
      editionYear: 2027,
      title: "Cross-edition test",
      dueAt: "2027-05-31T23:59:59+05:30",
      displayDate: "31st May, 2027",
      originalDate: null,
      isExtended: false,
      isConferenceDate: false,
      sortOrder: 1,
      isVisible: true,
      status: "draft",
    });
    expect(mismatchRes).toEqual({
      ok: false,
      error: "Deadline does not belong to the selected edition.",
    });

    // Editor cannot delete a published deadline
    mockCreateServerSupabase.mockResolvedValueOnce({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "33333333-3333-4333-8333-333333333333",
                status: "published",
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const forbiddenDelete = await deleteDeadlineAction(
      "33333333-3333-4333-8333-333333333333",
      2027
    );
    expect(forbiddenDelete.ok).toBe(false);

    // Editor CAN delete a draft deadline
    const draftDeadline = {
      id: "33333333-3333-4333-8333-333333333333",
      status: "draft",
      title: "Draft deadline",
    };
    mockCreateServerSupabase.mockResolvedValueOnce({
      from: vi.fn((table: string) => {
        if (table === "deadlines") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: draftDeadline, error: null }),
              }),
            }),
            delete: vi.fn().mockReturnValue({ eq: deleteEq }),
          };
        }
        if (table === "audit_logs") {
          return { insert: insertAudit };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const deleted = await deleteDeadlineAction(
      "33333333-3333-4333-8333-333333333333",
      2027
    );
    expect(deleted).toEqual({
      ok: true,
      id: "33333333-3333-4333-8333-333333333333",
    });
    expect(deleteEq).toHaveBeenCalledWith(
      "id",
      "33333333-3333-4333-8333-333333333333"
    );
    expect(insertAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete",
        table_name: "deadlines",
        record_id: "33333333-3333-4333-8333-333333333333",
      })
    );
    expect(mockRevalidateTag).toHaveBeenCalledWith("edition:2027", {
      expire: 0,
    });

    // upsertResourceAction creates a resource and writes version + audit log
    const createdResource = {
      id: "44444444-4444-4444-8444-444444444444",
      edition_id: "11111111-1111-4111-8111-111111111111",
      label: "Word Template",
      category: "template",
      url: "https://drive.google.com/file/d/example",
      storage_path: null,
      sort_order: 1,
      status: "draft",
    };

    mockCreateServerSupabase.mockResolvedValueOnce({
      from: vi.fn((table: string) => {
        if (table === "resources") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: createdResource, error: null }),
              }),
            }),
          };
        }
        if (table === "content_versions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi
                        .fn()
                        .mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
            insert: insertVersion,
          };
        }
        if (table === "audit_logs") {
          return { insert: insertAudit };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const resourceRes = await upsertResourceAction({
      editionId: "11111111-1111-4111-8111-111111111111",
      editionYear: 2027,
      label: "Word Template",
      category: "template",
      url: "https://drive.google.com/file/d/example",
      storagePath: null,
      sortOrder: 1,
      status: "draft",
    });
    expect(resourceRes).toEqual({
      ok: true,
      id: "44444444-4444-4444-8444-444444444444",
    });
    expect(insertVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        table_name: "resources",
        record_id: "44444444-4444-4444-8444-444444444444",
        version_number: 1,
      })
    );
  });
});

describe("/api/preview route handler", () => {
  beforeEach(() => {
    mockRequireAdminSession.mockReset();
    mockDraftModeEnable.mockReset();
    mockDraftModeDisable.mockReset();
  });

  it("returns 503 when unconfigured, redirects aal1 to /admin/mfa, and unauthenticated to /admin/login", async () => {
    mockRequireAdminSession.mockRejectedValueOnce(
      new AdminAuthError("NOT_CONFIGURED", "Supabase is not configured yet.")
    );
    const res503 = await previewGet(
      new NextRequest("http://localhost:3000/api/preview?edition=2027")
    );
    expect(res503.status).toBe(503);

    mockRequireAdminSession.mockRejectedValueOnce(
      new AdminAuthError("MFA_REQUIRED", "MFA required.")
    );
    const resMfa = await previewGet(
      new NextRequest("http://localhost:3000/api/preview?edition=2027")
    );
    expect(resMfa.status).toBe(307);
    expect(resMfa.headers.get("location")).toBe("http://localhost:3000/admin/mfa");

    mockRequireAdminSession.mockRejectedValueOnce(
      new AdminAuthError("UNAUTHENTICATED", "Auth required.")
    );
    const resLogin = await previewGet(
      new NextRequest("http://localhost:3000/api/preview?edition=2027")
    );
    expect(resLogin.status).toBe(307);
    expect(resLogin.headers.get("location")).toBe(
      "http://localhost:3000/admin/login"
    );
  });

  it("enables/disables draftMode for aal2 admins and blocks protocol-relative & backslash open redirects", async () => {
    mockRequireAdminSession.mockResolvedValue({
      userId: "user-admin-1",
      email: "chair@iem.edu.in",
      displayName: "Chair",
      role: "content_admin",
      canApproveFinancial: false,
      aal: "aal2",
    });

    const safeRes = await previewGet(
      new NextRequest(
        "http://localhost:3000/api/preview?edition=2027&redirect=/call-for-papers?edition=2027"
      )
    );
    expect(mockDraftModeEnable).toHaveBeenCalledTimes(1);
    expect(safeRes.status).toBe(307);
    expect(safeRes.headers.get("location")).toBe(
      "http://localhost:3000/call-for-papers?edition=2027"
    );

    const protocolRelativeRes = await previewGet(
      new NextRequest(
        "http://localhost:3000/api/preview?edition=2027&redirect=//evil.example.com"
      )
    );
    expect(protocolRelativeRes.headers.get("location")).toBe(
      "http://localhost:3000/?edition=2027"
    );

    const backslashRes = await previewGet(
      new NextRequest(
        "http://localhost:3000/api/preview?edition=2027&redirect=/\\evil.example.com"
      )
    );
    expect(backslashRes.headers.get("location")).toBe(
      "http://localhost:3000/?edition=2027"
    );

    const disableRes = await previewGet(
      new NextRequest("http://localhost:3000/api/preview?edition=2027&disable=1")
    );
    expect(mockDraftModeDisable).toHaveBeenCalledTimes(1);
    expect(disableRes.headers.get("location")).toBe(
      "http://localhost:3000/?edition=2027"
    );
  });
});

describe("CMS Zod validation schemas", () => {
  it("accepts valid Asia/Kolkata settings and rejects non-IST timezone, invalid URL, or inverted dates", () => {
    const valid = buildValidEditionSettingsInput();
    expect(updateEditionSettingsSchema.safeParse(valid).success).toBe(true);

    expect(
      updateEditionSettingsSchema.safeParse({
        ...valid,
        timezone: "UTC",
      }).success
    ).toBe(false);

    expect(
      updateEditionSettingsSchema.safeParse({
        ...valid,
        timezone: "America/New_York",
      }).success
    ).toBe(false);

    expect(
      updateEditionSettingsSchema.safeParse({
        ...valid,
        canonicalUrl: "javascript:alert(1)",
      }).success
    ).toBe(false);

    expect(
      updateEditionSettingsSchema.safeParse({
        ...valid,
        endDate: "2027-08-16T09:00:00+05:30",
      }).success
    ).toBe(false);
  });

  it("enforces safeHttpUrlSchema in conferenceLinkSchema", () => {
    expect(
      conferenceLinkSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        key: "cmt_submission",
        label: "Microsoft CMT Portal",
        url: "https://cmt3.research.microsoft.com/MetaSphere2027",
        status: "published",
      }).success
    ).toBe(true);

    expect(
      conferenceLinkSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        key: "cmt_submission",
        label: "Bad Link",
        url: "javascript:alert('xss')",
        status: "draft",
      }).success
    ).toBe(false);

    expect(
      conferenceLinkSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        key: "cmt_submission",
        label: "Data URL",
        url: "data:text/html,<script>alert(1)</script>",
        status: "draft",
      }).success
    ).toBe(false);
  });

  it("validates deadlineInputSchema fields", () => {
    expect(
      deadlineInputSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        title: "Full paper submission",
        dueAt: "2027-05-31T23:59:59+05:30",
        displayDate: "31st May, 2027",
        originalDate: null,
        isExtended: false,
        isConferenceDate: false,
        sortOrder: 1,
        isVisible: true,
        status: "draft",
      }).success
    ).toBe(true);

    expect(
      deadlineInputSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        title: "",
        dueAt: "not-a-date",
        displayDate: "",
        isExtended: false,
        isConferenceDate: false,
        sortOrder: 1,
        isVisible: true,
        status: "draft",
      }).success
    ).toBe(false);
  });
});

describe("CMS Server Actions fail-closed auth, RBAC, versioning, and audit logging", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    mockRevalidateTag.mockReset();
    mockRequireAdminSession.mockReset();
    mockCreateServerSupabase.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it("returns clean unconfigured error across all admin actions when Supabase is not configured", async () => {
    mockRequireAdminSession.mockRejectedValue(
      new AdminAuthError(
        "NOT_CONFIGURED",
        "Supabase is not configured yet. See docs/operations/supabase-handoff.md."
      )
    );

    const editionRes = await updateEditionSettingsAction(
      "11111111-1111-4111-8111-111111111111",
      buildValidEditionSettingsInput()
    );
    expect(editionRes).toEqual({
      ok: false,
      error: "Supabase is not configured yet.",
    });

    const deadlineRes = await upsertDeadlineAction({
      editionId: "11111111-1111-4111-8111-111111111111",
      editionYear: 2027,
      title: "Full paper submission",
      dueAt: "2027-05-31T23:59:59+05:30",
      displayDate: "31st May, 2027",
      originalDate: null,
      isExtended: false,
      isConferenceDate: false,
      sortOrder: 1,
      isVisible: true,
      status: "draft",
    });
    expect(deadlineRes).toEqual({
      ok: false,
      error: "Supabase is not configured yet.",
    });

    const linkRes = await upsertConferenceLinkAction({
      editionId: "11111111-1111-4111-8111-111111111111",
      editionYear: 2027,
      key: "cmt_submission",
      label: "CMT Portal",
      url: "https://cmt3.research.microsoft.com/MetaSphere2027",
      status: "draft",
    });
    expect(linkRes).toEqual({
      ok: false,
      error: "Supabase is not configured yet.",
    });

    const publishRes = await publishContentAction(
      "deadlines",
      "22222222-2222-4222-8222-222222222222",
      2027,
      "published"
    );
    expect(publishRes).toEqual({
      ok: false,
      error: "Supabase is not configured yet.",
    });
  });

  it("forbids editor from publishing/archiving content", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    mockRequireAdminSession.mockResolvedValue({
      userId: "user-editor-1",
      email: "editor@iem.edu.in",
      displayName: "Editor",
      role: "editor",
      canApproveFinancial: false,
      aal: "aal2",
    });

    const res = await publishContentAction(
      "deadlines",
      "22222222-2222-4222-8222-222222222222",
      2027,
      "published"
    );

    expect(res).toEqual({
      ok: false,
      error: expect.stringMatching(/permission|content_admin|super_admin/i),
    });
    expect(mockCreateServerSupabase).not.toHaveBeenCalled();
  });

  it("writes content_versions and audit_logs and revalidates tag when content_admin publishes", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    mockRequireAdminSession.mockResolvedValue({
      userId: "user-admin-1",
      email: "chair@iem.edu.in",
      displayName: "Chair",
      role: "content_admin",
      canApproveFinancial: false,
      aal: "aal2",
    });

    const beforeRow = {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Full paper submission",
      status: "draft",
    };
    const afterRow = { ...beforeRow, status: "published" };

    const insertVersion = vi.fn().mockResolvedValue({ error: null });
    const insertAudit = vi.fn().mockResolvedValue({ error: null });

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "deadlines") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: beforeRow, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi
                    .fn()
                    .mockResolvedValue({ data: afterRow, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "content_versions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi
                        .fn()
                        .mockResolvedValue({ data: { version_number: 2 }, error: null }),
                    }),
                  }),
                }),
              }),
            }),
            insert: insertVersion,
          };
        }
        if (table === "audit_logs") {
          return {
            insert: insertAudit,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    mockCreateServerSupabase.mockResolvedValue(supabaseMock);

    const res = await publishContentAction(
      "deadlines",
      "22222222-2222-4222-8222-222222222222",
      2027,
      "published"
    );

    expect(res).toEqual({ ok: true, id: "22222222-2222-4222-8222-222222222222" });
    expect(insertVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        table_name: "deadlines",
        record_id: "22222222-2222-4222-8222-222222222222",
        version_number: 3,
        snapshot: afterRow,
        created_by: "user-admin-1",
      })
    );
    expect(insertAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "user-admin-1",
        actor_role: "content_admin",
        action: "publish",
        table_name: "deadlines",
        record_id: "22222222-2222-4222-8222-222222222222",
        before_data: beforeRow,
        after_data: afterRow,
      })
    );
    expect(mockRevalidateTag).toHaveBeenCalledWith("edition:2027", {
      expire: 0,
    });
  });

  it("round-trips toIstDateTimeLocalValue and fromIstDateTimeLocalValue in Asia/Kolkata", () => {
    // 2027-08-17T03:30:00Z === 2027-08-17T09:00:00+05:30
    const localInput = toIstDateTimeLocalValue("2027-08-17T03:30:00Z");
    expect(localInput).toBe("2027-08-17T09:00");

    const isoIst = fromIstDateTimeLocalValue(localInput);
    expect(isoIst).toBe("2027-08-17T09:00:00+05:30");
    expect(Date.parse(isoIst)).toBe(Date.parse("2027-08-17T03:30:00Z"));
  });

  it("enforces UUID editionId and validates resourceInputSchema", () => {
    expect(
      deadlineInputSchema.safeParse({
        editionId: "fallback-edition-2027",
        editionYear: 2027,
        title: "Full paper submission",
        dueAt: "2027-05-31T23:59:59+05:30",
        displayDate: "31st May, 2027",
        originalDate: null,
        isExtended: false,
        isConferenceDate: false,
        sortOrder: 1,
        isVisible: true,
        status: "draft",
      }).success
    ).toBe(false);

    expect(
      resourceInputSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        label: "LaTeX Template",
        category: "template",
        url: "https://www.overleaf.com/latex/templates/springer",
        storagePath: null,
        sortOrder: 1,
        status: "draft",
      }).success
    ).toBe(true);

    expect(
      resourceInputSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        label: "Bad Resource",
        category: "template",
        url: "javascript:alert(1)",
        storagePath: null,
        sortOrder: 1,
        status: "draft",
      }).success
    ).toBe(false);

    expect(
      resourceInputSchema.safeParse({
        editionId: "11111111-1111-4111-8111-111111111111",
        editionYear: 2027,
        label: "Missing Target",
        category: "template",
        url: "",
        storagePath: "",
        sortOrder: 1,
        status: "draft",
      }).success
    ).toBe(false);
  });

  it("enforces edition ownership on deadline updates and supports deleteDeadlineAction + upsertResourceAction", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    mockRequireAdminSession.mockResolvedValue({
      userId: "user-editor-1",
      email: "editor@iem.edu.in",
      displayName: "Editor",
      role: "editor",
      canApproveFinancial: false,
      aal: "aal2",
    });

    const insertAudit = vi.fn().mockResolvedValue({ error: null });
    const insertVersion = vi.fn().mockResolvedValue({ error: null });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });

    const mismatchRow = {
      id: "33333333-3333-4333-8333-333333333333",
      edition_id: "99999999-9999-4999-8999-999999999999",
      status: "draft",
    };

    mockCreateServerSupabase.mockResolvedValueOnce({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: mismatchRow, error: null }),
          }),
        }),
      }),
    });

    const mismatchRes = await upsertDeadlineAction({
      id: "33333333-3333-4333-8333-333333333333",
      editionId: "11111111-1111-4111-8111-111111111111",
      editionYear: 2027,
      title: "Cross-edition test",
      dueAt: "2027-05-31T23:59:59+05:30",
      displayDate: "31st May, 2027",
      originalDate: null,
      isExtended: false,
      isConferenceDate: false,
      sortOrder: 1,
      isVisible: true,
      status: "draft",
    });
    expect(mismatchRes).toEqual({
      ok: false,
      error: "Deadline does not belong to the selected edition.",
    });

    // Editor cannot delete a published deadline
    mockCreateServerSupabase.mockResolvedValueOnce({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "33333333-3333-4333-8333-333333333333",
                status: "published",
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const forbiddenDelete = await deleteDeadlineAction(
      "33333333-3333-4333-8333-333333333333",
      2027
    );
    expect(forbiddenDelete.ok).toBe(false);

    // Editor CAN delete a draft deadline
    const draftDeadline = {
      id: "33333333-3333-4333-8333-333333333333",
      status: "draft",
      title: "Draft deadline",
    };
    mockCreateServerSupabase.mockResolvedValueOnce({
      from: vi.fn((table: string) => {
        if (table === "deadlines") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: draftDeadline, error: null }),
              }),
            }),
            delete: vi.fn().mockReturnValue({ eq: deleteEq }),
          };
        }
        if (table === "audit_logs") {
          return { insert: insertAudit };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const deleted = await deleteDeadlineAction(
      "33333333-3333-4333-8333-333333333333",
      2027
    );
    expect(deleted).toEqual({
      ok: true,
      id: "33333333-3333-4333-8333-333333333333",
    });
    expect(deleteEq).toHaveBeenCalledWith(
      "id",
      "33333333-3333-4333-8333-333333333333"
    );
    expect(insertAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete",
        table_name: "deadlines",
        record_id: "33333333-3333-4333-8333-333333333333",
      })
    );
    expect(mockRevalidateTag).toHaveBeenCalledWith("edition:2027", {
      expire: 0,
    });

    // upsertResourceAction creates a resource and writes version + audit log
    const createdResource = {
      id: "44444444-4444-4444-8444-444444444444",
      edition_id: "11111111-1111-4111-8111-111111111111",
      label: "Word Template",
      category: "template",
      url: "https://drive.google.com/file/d/example",
      storage_path: null,
      sort_order: 1,
      status: "draft",
    };

    mockCreateServerSupabase.mockResolvedValueOnce({
      from: vi.fn((table: string) => {
        if (table === "resources") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: createdResource, error: null }),
              }),
            }),
          };
        }
        if (table === "content_versions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi
                        .fn()
                        .mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
            insert: insertVersion,
          };
        }
        if (table === "audit_logs") {
          return { insert: insertAudit };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const resourceRes = await upsertResourceAction({
      editionId: "11111111-1111-4111-8111-111111111111",
      editionYear: 2027,
      label: "Word Template",
      category: "template",
      url: "https://drive.google.com/file/d/example",
      storagePath: null,
      sortOrder: 1,
      status: "draft",
    });
    expect(resourceRes).toEqual({
      ok: true,
      id: "44444444-4444-4444-8444-444444444444",
    });
    expect(insertVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        table_name: "resources",
        record_id: "44444444-4444-4444-8444-444444444444",
        version_number: 1,
      })
    );
  });
});

describe("/api/preview route handler", () => {
  beforeEach(() => {
    mockRequireAdminSession.mockReset();
    mockDraftModeEnable.mockReset();
    mockDraftModeDisable.mockReset();
  });

  it("returns 503 when unconfigured, redirects aal1 to /admin/mfa, and unauthenticated to /admin/login", async () => {
    mockRequireAdminSession.mockRejectedValueOnce(
      new AdminAuthError("NOT_CONFIGURED", "Supabase is not configured yet.")
    );
    const res503 = await previewGet(
      new NextRequest("http://localhost:3000/api/preview?edition=2027")
    );
    expect(res503.status).toBe(503);

    mockRequireAdminSession.mockRejectedValueOnce(
      new AdminAuthError("MFA_REQUIRED", "MFA required.")
    );
    const resMfa = await previewGet(
      new NextRequest("http://localhost:3000/api/preview?edition=2027")
    );
    expect(resMfa.status).toBe(307);
    expect(resMfa.headers.get("location")).toBe("http://localhost:3000/admin/mfa");

    mockRequireAdminSession.mockRejectedValueOnce(
      new AdminAuthError("UNAUTHENTICATED", "Auth required.")
    );
    const resLogin = await previewGet(
      new NextRequest("http://localhost:3000/api/preview?edition=2027")
    );
    expect(resLogin.status).toBe(307);
    expect(resLogin.headers.get("location")).toBe(
      "http://localhost:3000/admin/login"
    );
  });

  it("enables/disables draftMode for aal2 admins and blocks protocol-relative & backslash open redirects", async () => {
    mockRequireAdminSession.mockResolvedValue({
      userId: "user-admin-1",
      email: "chair@iem.edu.in",
      displayName: "Chair",
      role: "content_admin",
      canApproveFinancial: false,
      aal: "aal2",
    });

    const safeRes = await previewGet(
      new NextRequest(
        "http://localhost:3000/api/preview?edition=2027&redirect=/call-for-papers?edition=2027"
      )
    );
    expect(mockDraftModeEnable).toHaveBeenCalledTimes(1);
    expect(safeRes.status).toBe(307);
    expect(safeRes.headers.get("location")).toBe(
      "http://localhost:3000/call-for-papers?edition=2027"
    );

    const protocolRelativeRes = await previewGet(
      new NextRequest(
        "http://localhost:3000/api/preview?edition=2027&redirect=//evil.example.com"
      )
    );
    expect(protocolRelativeRes.headers.get("location")).toBe(
      "http://localhost:3000/?edition=2027"
    );

    const backslashRes = await previewGet(
      new NextRequest(
        "http://localhost:3000/api/preview?edition=2027&redirect=/\\evil.example.com"
      )
    );
    expect(backslashRes.headers.get("location")).toBe(
      "http://localhost:3000/?edition=2027"
    );

    const disableRes = await previewGet(
      new NextRequest("http://localhost:3000/api/preview?edition=2027&disable=1")
    );
    expect(mockDraftModeDisable).toHaveBeenCalledTimes(1);
    expect(disableRes.headers.get("location")).toBe(
      "http://localhost:3000/?edition=2027"
    );
  });
});
