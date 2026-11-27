import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockStorageUpload,
  mockStorageGetPublicUrl,
  mockStorageCreateSignedUrl,
  mockFrom,
  mockAuthAdminInviteUserByEmail,
  mockServerSupabaseInstance,
  mockAdminSupabaseInstance,
  mockRequireAdminSession,
  mockRevalidateTag,
} = vi.hoisted(() => {
  const mockStorageUpload = vi.fn();
  const mockStorageGetPublicUrl = vi.fn();
  const mockStorageCreateSignedUrl = vi.fn();
  const mockFrom = vi.fn();
  const mockAuthAdminInviteUserByEmail = vi.fn();

  const mockServerSupabaseInstance = {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockStorageUpload,
        getPublicUrl: mockStorageGetPublicUrl,
        createSignedUrl: mockStorageCreateSignedUrl,
      }),
    },
    from: mockFrom,
  };

  const mockAdminSupabaseInstance = {
    auth: {
      admin: {
        inviteUserByEmail: mockAuthAdminInviteUserByEmail,
      },
    },
    from: mockFrom,
  };

  const mockRequireAdminSession = vi.fn();
  const mockRevalidateTag = vi.fn();

  return {
    mockStorageUpload,
    mockStorageGetPublicUrl,
    mockStorageCreateSignedUrl,
    mockFrom,
    mockAuthAdminInviteUserByEmail,
    mockServerSupabaseInstance,
    mockAdminSupabaseInstance,
    mockRequireAdminSession,
    mockRevalidateTag,
  };
});

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidateTag: mockRevalidateTag,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn().mockResolvedValue(mockServerSupabaseInstance),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: vi.fn().mockReturnValue(mockAdminSupabaseInstance),
}));

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    requireAdminSession: mockRequireAdminSession,
  };
});

import { validateUploadFile } from "../../src/lib/validation/common";
import { canPublishFinancialRecord } from "../../src/lib/permissions/rbac";
import { registrationFeeSchema } from "../../src/features/registration/schemas";
import {
  publishRegistrationFeeAction,
  upsertRegistrationFeeAction,
} from "../../src/features/registration/actions";
import { uploadConferenceAssetAction } from "../../src/features/resources/upload-action";
import { inviteAdminUserAction } from "../../src/features/admin-users/actions";
import { upsertSpeakerAction } from "../../src/features/people/actions";
import { upsertSponsorAction } from "../../src/features/sponsors/actions";
import { AdminAuthError } from "../../src/lib/auth/session";

const EDITION_UUID = "11111111-1111-1111-1111-111111111111";
const FEE_UUID = "22222222-2222-2222-2222-222222222222";
const PERSON_UUID = "33333333-3333-3333-3333-333333333333";
const SPEAKER_UUID = "44444444-4444-4444-4444-444444444444";
const ORIGINAL_ENV = { ...process.env };

function mockAuditAndVersionChain(auditInsertMock: ReturnType<typeof vi.fn>) {
  const mockVersionSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }),
  });
  const mockVersionInsert = vi.fn().mockResolvedValue({ error: null });
  return {
    content_versions: {
      select: mockVersionSelect,
      insert: mockVersionInsert,
    },
    audit_logs: {
      insert: auditInsertMock,
    },
    conference_editions: {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { year: 2027 },
            error: null,
          }),
        }),
      }),
    },
  };
}

describe("validateUploadFile", () => {
  it("accepts .webp image/webp and .pdf application/pdf", () => {
    expect(
      validateUploadFile({ name: "photo.webp", type: "image/webp", size: 1024 })
    ).toEqual({ ok: true });
    expect(
      validateUploadFile({ name: "doc.pdf", type: "application/pdf", size: 2048 })
    ).toEqual({ ok: true });
  });

  it("rejects .svg, .html, files >10MB, and spoofed .svg with image/png MIME", () => {
    expect(
      validateUploadFile({ name: "icon.svg", type: "image/svg+xml", size: 512 }).ok
    ).toBe(false);
    expect(
      validateUploadFile({ name: "page.html", type: "text/html", size: 512 }).ok
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "big.pdf",
        type: "application/pdf",
        size: 10 * 1024 * 1024 + 1,
      }).ok
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "banner.svg",
        type: "image/png",
        size: 1024,
      }).ok
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "photo.png",
        type: "image/svg+xml",
        size: 1024,
      }).ok
    ).toBe(false);
  });
});

describe("registrationFeeSchema & financial approval gate", () => {
  const validFee = {
    editionId: EDITION_UUID,
    editionYear: 2027,
    category: "Early Bird Student",
    amountInr: 0,
    amountUsd: 0,
    indianDisplay: "₹0",
    foreignDisplay: "$0",
    taxNote: "Rates are Inclusive of 18% GST",
    sortOrder: 0,
  };

  it("accepts non-negative integer amountInr/amountUsd and rejects negatives or empty category", () => {
    expect(registrationFeeSchema.safeParse(validFee).success).toBe(true);
    expect(
      registrationFeeSchema.safeParse({
        ...validFee,
        amountInr: 5000,
        amountUsd: 150,
      }).success
    ).toBe(true);
    expect(
      registrationFeeSchema.safeParse({ ...validFee, amountInr: -1 }).success
    ).toBe(false);
    expect(
      registrationFeeSchema.safeParse({ ...validFee, amountUsd: -5 }).success
    ).toBe(false);
    expect(
      registrationFeeSchema.safeParse({ ...validFee, category: "" }).success
    ).toBe(false);
    expect(
      registrationFeeSchema.safeParse({ ...validFee, editionId: "bad" }).success
    ).toBe(false);
  });

  it("gates canPublishFinancialRecord properly across roles", () => {
    expect(
      canPublishFinancialRecord({
        role: "content_admin",
        canApproveFinancial: false,
      })
    ).toBe(false);
    expect(
      canPublishFinancialRecord({
        role: "content_admin",
        canApproveFinancial: true,
      })
    ).toBe(true);
    expect(
      canPublishFinancialRecord({
        role: "super_admin",
        canApproveFinancial: false,
      })
    ).toBe(true);
    expect(
      canPublishFinancialRecord({ role: "editor", canApproveFinancial: true })
    ).toBe(false);
  });

  it("blocks content_admin without financial flag from publishing fees, and allows approver", async () => {
    mockRequireAdminSession.mockRejectedValueOnce(
      new AdminAuthError(
        "FORBIDDEN",
        "Financial approval permission is required for this action."
      )
    );

    const blocked = await publishRegistrationFeeAction(FEE_UUID, 2027);
    expect(blocked.ok).toBe(false);
    expect(mockRequireAdminSession).toHaveBeenCalledWith({
      requireFinancialApproval: true,
    });

    mockRequireAdminSession.mockResolvedValueOnce({
      userId: "approver-1",
      email: "finance@iem.edu.in",
      displayName: "Finance Chair",
      role: "content_admin",
      canApproveFinancial: true,
      aal: "aal2",
    });

    const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });
    const shared = mockAuditAndVersionChain(mockAuditInsert);
    mockFrom.mockImplementation((table: string) => {
      if (table === "registration_fees") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: FEE_UUID,
                  edition_id: EDITION_UUID,
                  status: "draft",
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: FEE_UUID,
                    edition_id: EDITION_UUID,
                    status: "published",
                    financial_approved_by: "approver-1",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return shared[table as keyof typeof shared] ?? {};
    });

    const allowed = await publishRegistrationFeeAction(FEE_UUID, 2027);
    expect(allowed.ok).toBe(true);
    expect(mockAuditInsert).toHaveBeenCalled();
    expect(mockRevalidateTag).toHaveBeenCalledWith("edition:2027", { expire: 0 });
  });

  it("blocks saving a new registration fee directly as published when lacking financial approval", async () => {
    mockRequireAdminSession.mockResolvedValue({
      userId: "ca-1",
      email: "ca@iem.edu.in",
      displayName: "Content Admin",
      role: "content_admin",
      canApproveFinancial: false,
      aal: "aal2",
    });

    const result = await upsertRegistrationFeeAction(null, {
      ...validFee,
      status: "published",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/financial approval/i);
    }
  });
});

describe("uploadConferenceAssetAction", () => {
  beforeEach(() => {
    mockRequireAdminSession.mockReset();
    mockStorageUpload.mockReset();
    mockStorageGetPublicUrl.mockReset();
    mockStorageCreateSignedUrl.mockReset();
    mockFrom.mockReset();
    mockServerSupabaseInstance.storage.from.mockReturnValue({
      upload: mockStorageUpload,
      getPublicUrl: mockStorageGetPublicUrl,
      createSignedUrl: mockStorageCreateSignedUrl,
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("rejects unauthenticated requests and SVG uploads even if named .png", async () => {
    mockRequireAdminSession.mockRejectedValueOnce(
      new AdminAuthError("UNAUTHENTICATED", "Authentication required.")
    );
    const fd1 = new FormData();
    fd1.append("file", new File(["pdf"], "doc.pdf", { type: "application/pdf" }));
    fd1.append("bucket", "conference-public");
    fd1.append("editionYear", "2027");
    const r1 = await uploadConferenceAssetAction(fd1);
    expect(r1.ok).toBe(false);

    mockRequireAdminSession.mockResolvedValueOnce({
      userId: "user-1",
      email: "admin@iem.edu.in",
      displayName: "Admin",
      role: "content_admin",
      canApproveFinancial: false,
      aal: "aal2",
    });
    const fd2 = new FormData();
    fd2.append("file", new File(["<svg/>"], "fake.svg", { type: "image/png" }));
    fd2.append("bucket", "conference-public");
    fd2.append("editionYear", "2027");
    const r2 = await uploadConferenceAssetAction(fd2);
    expect(r2.ok).toBe(false);
  });

  it("uploads .pdf to conference-public, writes audit_logs, and returns url + path", async () => {
    mockRequireAdminSession.mockResolvedValue({
      userId: "user-1",
      email: "admin@iem.edu.in",
      displayName: "Admin",
      role: "content_admin",
      canApproveFinancial: false,
      aal: "aal2",
    });
    mockStorageUpload.mockResolvedValue({
      data: { path: "2027/123-doc.pdf" },
      error: null,
    });
    mockStorageGetPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          "https://example.supabase.co/storage/v1/object/public/conference-public/2027/123-doc.pdf",
      },
    });
    const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) =>
      table === "audit_logs" ? { insert: mockAuditInsert } : {}
    );

    const fd = new FormData();
    fd.append("file", new File(["content"], "doc.pdf", { type: "application/pdf" }));
    fd.append("bucket", "conference-public");
    fd.append("editionYear", "2027");

    const result = await uploadConferenceAssetAction(fd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toContain("conference-public");
      expect(result.data.path).toMatch(/^2027\/.*doc\.pdf$/);
    }
    expect(mockAuditInsert).toHaveBeenCalled();
  });
});

describe("inviteAdminUserAction", () => {
  beforeEach(() => {
    mockRequireAdminSession.mockReset();
    mockAuthAdminInviteUserByEmail.mockReset();
    mockFrom.mockReset();
  });

  it("rejects non-super_admin and invites cleanly for super_admin without writing unknown columns", async () => {
    mockRequireAdminSession.mockRejectedValueOnce(
      new AdminAuthError("FORBIDDEN", "Only super_admin may invite users.")
    );
    const r1 = await inviteAdminUserAction({
      email: "new@iem.edu.in",
      role: "editor",
      canApproveFinancial: false,
    });
    expect(r1.ok).toBe(false);

    mockRequireAdminSession.mockResolvedValueOnce({
      userId: "super-1",
      email: "super@iem.edu.in",
      displayName: "Super Admin",
      role: "super_admin",
      canApproveFinancial: true,
      aal: "aal2",
    });
    mockAuthAdminInviteUserByEmail.mockResolvedValue({
      data: { user: { id: "new-user-id" } },
      error: null,
    });
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "admin_roles") return { upsert: mockUpsert };
      if (table === "audit_logs") return { insert: mockAuditInsert };
      return {};
    });

    const r2 = await inviteAdminUserAction({
      email: "new@iem.edu.in",
      role: "editor",
      canApproveFinancial: false,
    });
    expect(r2.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ invited_by: expect.anything() }),
      expect.any(Object)
    );
    expect(mockAuditInsert).toHaveBeenCalled();
  });
});

describe("upsertSpeakerAction & upsertSponsorAction", () => {
  beforeEach(() => {
    mockRequireAdminSession.mockReset();
    mockFrom.mockReset();
    mockRevalidateTag.mockReset();
  });

  it("validates UUID and photoUrl, creates linked people + speakers rows, and audits both", async () => {
    mockRequireAdminSession.mockResolvedValue({
      userId: "user-1",
      email: "a@iem.edu.in",
      displayName: "Admin",
      role: "content_admin",
      canApproveFinancial: false,
      aal: "aal2",
    });

    const badUuid = await upsertSpeakerAction(null, {
      editionId: "bad-id",
      fullName: "Dr. Jane Smith",
      sortOrder: 0,
    });
    expect(badUuid.ok).toBe(false);

    const badUrl = await upsertSpeakerAction(null, {
      editionId: EDITION_UUID,
      fullName: "Dr. Jane Smith",
      photoUrl: "javascript:alert(1)",
      sortOrder: 0,
    });
    expect(badUrl.ok).toBe(false);

    const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });
    const shared = mockAuditAndVersionChain(mockAuditInsert);

    mockFrom.mockImplementation((table: string) => {
      if (table === "people") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: PERSON_UUID, full_name: "Dr. Jane Smith" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "speakers") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: SPEAKER_UUID,
                  edition_id: EDITION_UUID,
                  person_id: PERSON_UUID,
                  status: "draft",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return shared[table as keyof typeof shared] ?? {};
    });

    const okRes = await upsertSpeakerAction(null, {
      editionId: EDITION_UUID,
      editionYear: 2027,
      fullName: "Dr. Jane Smith",
      designation: "Professor",
      institution: "IIT Kharagpur",
      photoUrl: "https://res.cloudinary.com/dh87hfwml/image/upload/v1/demo.jpg",
      sortOrder: 1,
    });
    expect(okRes.ok).toBe(true);
    expect(mockAuditInsert).toHaveBeenCalledTimes(2);
    expect(mockRevalidateTag).toHaveBeenCalledWith("edition:2027", { expire: 0 });
  });

  it("validates sponsor required logoUrl and tier enum", async () => {
    mockRequireAdminSession.mockResolvedValue({
      userId: "user-1",
      email: "a@iem.edu.in",
      displayName: "Admin",
      role: "content_admin",
      canApproveFinancial: false,
      aal: "aal2",
    });

    const badLogo = await upsertSponsorAction(null, {
      editionId: EDITION_UUID,
      name: "IEEE",
      tier: "technical_sponsor",
      logoUrl: "",
      websiteUrl: "https://ieee.org",
      sortOrder: 0,
    });
    expect(badLogo.ok).toBe(false);

    const badUrl = await upsertSponsorAction(null, {
      editionId: EDITION_UUID,
      name: "IEEE",
      tier: "platinum",
      logoUrl: "https://res.cloudinary.com/dh87hfwml/image/upload/v1/logo.png",
      websiteUrl: "javascript:alert(1)",
      sortOrder: 0,
    });
    expect(badUrl.ok).toBe(false);

    const badTier = await upsertSponsorAction(null, {
      editionId: EDITION_UUID,
      name: "IEEE",
      tier: "diamond" as never,
      logoUrl: "https://res.cloudinary.com/dh87hfwml/image/upload/v1/logo.png",
      sortOrder: 0,
    });
    expect(badTier.ok).toBe(false);
  });
});
