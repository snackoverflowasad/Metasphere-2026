import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetClaims = vi.fn();
let capturedSetAll:
  | ((
      cookies: Array<{
        name: string;
        value: string;
        options?: Record<string, unknown>;
      }>
    ) => void)
  | null = null;

vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/ssr")>();
  return {
    ...actual,
    createServerClient: vi.fn((_url, _key, options) => {
      capturedSetAll = options?.cookies?.setAll ?? null;
      return {
        auth: {
          getClaims: mockGetClaims,
        },
      };
    }),
  };
});

import {
  editionYearSchema,
  publicationStatusSchema,
  safeHttpUrlSchema,
  validateUploadFile,
} from "../../src/lib/validation/common";
import {
  canPerform,
  canPublishFinancialRecord,
} from "../../src/lib/permissions/rbac";
import {
  getSupabasePublicEnv,
  getSupabaseSecretKey,
  isSupabaseConfigured,
} from "../../src/lib/supabase/config";
import { createAdminSupabase } from "../../src/lib/supabase/admin";
import { getAdminContext, requireAdminSession } from "../../src/lib/auth/session";
import { proxy } from "../../src/proxy";

const ORIGINAL_ENV = { ...process.env };

describe("common validation schemas and upload guard", () => {
  it("accepts http/https URLs and rejects javascript:, data:, vbscript:, and non-http schemes", () => {
    expect(
      safeHttpUrlSchema.safeParse(
        "https://cmt3.research.microsoft.com/MetaSphere2026"
      ).success
    ).toBe(true);
    expect(safeHttpUrlSchema.safeParse("http://localhost:3000/admin").success).toBe(
      true
    );

    expect(safeHttpUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(
      safeHttpUrlSchema.safeParse("data:text/html,<script>alert(1)</script>")
        .success
    ).toBe(false);
    expect(safeHttpUrlSchema.safeParse("vbscript:msgbox(1)").success).toBe(false);
    expect(safeHttpUrlSchema.safeParse("file:///etc/passwd").success).toBe(false);
    expect(safeHttpUrlSchema.safeParse("ftp://example.com/file").success).toBe(
      false
    );
    expect(safeHttpUrlSchema.safeParse("/relative/path").success).toBe(false);
    expect(safeHttpUrlSchema.safeParse("").success).toBe(false);
  });

  it("validates publication status and edition year bounds", () => {
    expect(publicationStatusSchema.safeParse("draft").success).toBe(true);
    expect(publicationStatusSchema.safeParse("published").success).toBe(true);
    expect(publicationStatusSchema.safeParse("archived").success).toBe(true);
    expect(publicationStatusSchema.safeParse("deleted").success).toBe(false);

    expect(editionYearSchema.safeParse(2026).success).toBe(true);
    expect(editionYearSchema.safeParse(2027).success).toBe(true);
    expect(editionYearSchema.safeParse(2027.5).success).toBe(false);
    expect(editionYearSchema.safeParse(1999).success).toBe(false);
  });

  it("rejects SVG, HTML, XHTML, spoofed MIME types, empty files, and >10 MB uploads", () => {
    expect(
      validateUploadFile({
        name: "bad.svg",
        type: "image/svg+xml",
        size: 1024,
      }).ok
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "spoofed.svg",
        type: "image/png",
        size: 1024,
      }).ok
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "page.html",
        type: "text/html",
        size: 1024,
      }).ok
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "page.htm",
        type: "image/png",
        size: 1024,
      }).ok
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "page.xhtml",
        type: "application/xhtml+xml",
        size: 1024,
      }).ok
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "spoof-mime.png",
        type: "image/svg+xml",
        size: 1024,
      }).ok
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "empty.png",
        type: "image/png",
        size: 0,
      }).ok
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "too-large.pdf",
        type: "application/pdf",
        size: 10 * 1024 * 1024 + 1,
      }).ok
    ).toBe(false);
  });

  it("allows PNG, JPEG, WEBP, and PDF files up to 10 MB", () => {
    expect(
      validateUploadFile({
        name: "speaker.png",
        type: "image/png",
        size: 1024,
      })
    ).toEqual({ ok: true });
    expect(
      validateUploadFile({
        name: "speaker.jpg",
        type: "image/jpeg",
        size: 2048,
      })
    ).toEqual({ ok: true });
    expect(
      validateUploadFile({
        name: "photo.webp",
        type: "image/webp",
        size: 4096,
      })
    ).toEqual({ ok: true });
    expect(
      validateUploadFile({
        name: "brochure.pdf",
        type: "application/pdf",
        size: 10 * 1024 * 1024,
      })
    ).toEqual({ ok: true });
  });
});

describe("RBAC permissions matrix", () => {
  it("enforces role boundaries for draft editing, publishing, financial approval, and user management", () => {
    expect(canPerform("editor", "view_admin")).toBe(true);
    expect(canPerform("editor", "edit_draft")).toBe(true);
    expect(canPerform("editor", "upload_asset")).toBe(true);
    expect(canPerform("editor", "publish_content")).toBe(false);
    expect(canPerform("editor", "archive_content")).toBe(false);
    expect(canPerform("editor", "publish_financial")).toBe(false);
    expect(canPerform("editor", "manage_users")).toBe(false);

    expect(canPerform("content_admin", "edit_draft")).toBe(true);
    expect(canPerform("content_admin", "publish_content")).toBe(true);
    expect(canPerform("content_admin", "archive_content")).toBe(true);
    expect(canPerform("content_admin", "manage_users")).toBe(false);
    expect(
      canPerform("content_admin", "publish_financial", {
        canApproveFinancial: false,
      })
    ).toBe(false);
    expect(
      canPerform("content_admin", "publish_financial", {
        canApproveFinancial: true,
      })
    ).toBe(true);

    expect(canPerform("super_admin", "edit_draft")).toBe(true);
    expect(canPerform("super_admin", "publish_content")).toBe(true);
    expect(canPerform("super_admin", "publish_financial")).toBe(true);
    expect(canPerform("super_admin", "manage_users")).toBe(true);
  });

  it("gates financial publishing via canPublishFinancialRecord", () => {
    expect(
      canPublishFinancialRecord({
        role: "editor",
        canApproveFinancial: true,
      })
    ).toBe(false);
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
  });
});

describe("Supabase configuration helpers", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("returns false from isSupabaseConfigured() when env vars are absent", () => {
    expect(isSupabaseConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(isSupabaseConfigured()).toBe(false);

    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("throws when public or secret env vars are missing and blocks secret key in browser", () => {
    expect(() => getSupabasePublicEnv()).toThrow();
    expect(() => getSupabaseSecretKey()).toThrow();

    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    expect(getSupabaseSecretKey()).toBe("sb_secret_test");

    vi.stubGlobal("window", {});
    expect(() => getSupabaseSecretKey()).toThrow();
  });
});

describe("requireAdminSession AAL2 and RBAC enforcement", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it("rejects when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(requireAdminSession()).rejects.toThrow(/configured/i);
  });

  it("rejects unauthenticated sessions and aal1 sessions without TOTP MFA", async () => {
    const unauthClient = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    };
    await expect(
      requireAdminSession(undefined, unauthClient as never)
    ).rejects.toThrow(/authentication/i);

    const aal1Client = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: {
            claims: {
              sub: "user-1",
              email: "editor@iem.edu.in",
              aal: "aal1",
            },
          },
          error: null,
        }),
      },
    };
    await expect(
      requireAdminSession(undefined, aal1Client as never)
    ).rejects.toThrow(/aal2|mfa/i);
  });

  it("allows active aal2 admin and enforces requiredRoles & requireFinancialApproval", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        user_id: "user-2",
        email: "chair@iem.edu.in",
        display_name: "Program Chair",
        role: "content_admin",
        can_approve_financial: false,
        is_active: true,
      },
      error: null,
    });
    const mockEqActive = vi.fn().mockReturnValue({ maybeSingle: mockSingle });
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqActive });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

    const aal2Client = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: {
            claims: {
              sub: "user-2",
              email: "chair@iem.edu.in",
              aal: "aal2",
            },
          },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    };

    const ctx = await requireAdminSession(undefined, aal2Client as never);
    expect(ctx).toEqual({
      userId: "user-2",
      email: "chair@iem.edu.in",
      displayName: "Program Chair",
      role: "content_admin",
      canApproveFinancial: false,
      aal: "aal2",
    });

    await expect(
      requireAdminSession(
        { requiredRoles: ["super_admin"] },
        aal2Client as never
      )
    ).rejects.toThrow(/permission|role/i);

    await expect(
      requireAdminSession(
        { requireFinancialApproval: true },
        aal2Client as never
      )
    ).rejects.toThrow(/financial/i);
  });
});

describe("proxy route guard when Supabase is unconfigured", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("allows /admin/login and redirects /admin/overview to /admin/login cleanly", async () => {
    const loginRes = await proxy(
      new NextRequest("http://localhost:3000/admin/login")
    );
    expect(loginRes.status).toBe(200);

    const overviewRes = await proxy(
      new NextRequest("http://localhost:3000/admin/overview")
    );
    expect(overviewRes.status).toBe(307);
    expect(overviewRes.headers.get("location")).toBe(
      "http://localhost:3000/admin/login"
    );
  });
});

describe("createAdminSupabase and configured proxy MFA gate", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    mockGetClaims.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("createAdminSupabase throws when secret key is missing or called in browser", () => {
    delete process.env.SUPABASE_SECRET_KEY;
    expect(() => createAdminSupabase()).toThrow(/SUPABASE_SECRET_KEY/i);

    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    const client = createAdminSupabase();
    expect(client).toBeDefined();

    vi.stubGlobal("window", {});
    expect(() => createAdminSupabase()).toThrow(/browser/i);
  });

  it("proxy redirects unauthenticated to /admin/login, aal1 to /admin/mfa, and allows aal2", async () => {
    mockGetClaims.mockResolvedValueOnce({ data: null, error: null });
    const unauthRes = await proxy(
      new NextRequest("http://localhost:3000/admin/overview")
    );
    expect(unauthRes.status).toBe(307);
    expect(unauthRes.headers.get("location")).toBe(
      "http://localhost:3000/admin/login"
    );

    mockGetClaims.mockResolvedValueOnce({
      data: { claims: { sub: "user-1", aal: "aal1" } },
      error: null,
    });
    const aal1Res = await proxy(
      new NextRequest("http://localhost:3000/admin/overview")
    );
    expect(aal1Res.status).toBe(307);
    expect(aal1Res.headers.get("location")).toBe(
      "http://localhost:3000/admin/mfa"
    );

    mockGetClaims.mockResolvedValueOnce({
      data: { claims: { sub: "user-1", aal: "aal1" } },
      error: null,
    });
    const mfaPageRes = await proxy(
      new NextRequest("http://localhost:3000/admin/mfa")
    );
    expect(mfaPageRes.status).toBe(200);

    mockGetClaims.mockResolvedValueOnce({
      data: { claims: { sub: "user-1", aal: "aal2" } },
      error: null,
    });
    const aal2Res = await proxy(
      new NextRequest("http://localhost:3000/admin/overview")
    );
    expect(aal2Res.status).toBe(200);
  });

  it("proxy forwards refreshed setAll cookies onto redirects and redirects aal2 auth pages to /admin/overview", async () => {
    mockGetClaims.mockImplementationOnce(async () => {
      capturedSetAll?.([
        {
          name: "sb-access-token",
          value: "rotated-jwt",
          options: { path: "/", httpOnly: true },
        },
      ]);
      return {
        data: { claims: { sub: "user-1", aal: "aal1" } },
        error: null,
      };
    });

    const aal1Redirect = await proxy(
      new NextRequest("http://localhost:3000/admin/overview")
    );
    expect(aal1Redirect.status).toBe(307);
    expect(aal1Redirect.headers.get("location")).toBe(
      "http://localhost:3000/admin/mfa"
    );
    expect(aal1Redirect.cookies.get("sb-access-token")?.value).toBe(
      "rotated-jwt"
    );

    for (const path of ["/admin", "/admin/login", "/admin/mfa"]) {
      mockGetClaims.mockResolvedValueOnce({
        data: { claims: { sub: "user-1", aal: "aal2" } },
        error: null,
      });
      const res = await proxy(new NextRequest(`http://localhost:3000${path}`));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "http://localhost:3000/admin/overview"
      );
    }
  });

  it("proxy falls back cleanly to unauthenticated when getClaims throws, and getAdminContext delegates safely", async () => {
    mockGetClaims.mockRejectedValueOnce(new Error("fetch failed"));
    const loginRes = await proxy(
      new NextRequest("http://localhost:3000/admin/login")
    );
    expect(loginRes.status).toBe(200);

    mockGetClaims.mockRejectedValueOnce(new Error("fetch failed"));
    const overviewRes = await proxy(
      new NextRequest("http://localhost:3000/admin/overview")
    );
    expect(overviewRes.status).toBe(307);
    expect(overviewRes.headers.get("location")).toBe(
      "http://localhost:3000/admin/login"
    );

    const aal1Client = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { sub: "user-1", aal: "aal1" } },
          error: null,
        }),
      },
    };
    await expect(getAdminContext(aal1Client as never)).resolves.toBeNull();
  });
});
