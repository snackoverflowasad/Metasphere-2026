import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { AdminAuthError, requireAdminSession } from "@/lib/auth/session";
import { editionYearSchema } from "@/lib/validation/common";

const SAFE_RELATIVE_REDIRECT_RE = /^\/(?!\/|\\)/;

function resolveSafeRedirectPath(rawPath: string | null, year: number): string {
  if (!rawPath) {
    return `/?edition=${year}`;
  }
  const trimmed = rawPath.trim();
  if (!SAFE_RELATIVE_REDIRECT_RE.test(trimmed)) {
    return `/?edition=${year}`;
  }
  return trimmed;
}

/**
 * Toggles Next.js Draft Mode for authenticated `aal2` administrators so they
 * can preview unpublished edition drafts on public routes safely.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdminSession();
  } catch (error) {
    if (error instanceof AdminAuthError && error.code === "NOT_CONFIGURED") {
      return NextResponse.json(
        { ok: false, error: "Supabase is not configured yet." },
        { status: 503 }
      );
    }
    if (error instanceof AdminAuthError && error.code === "MFA_REQUIRED") {
      return NextResponse.redirect(new URL("/admin/mfa", request.url));
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const rawYear = Number(searchParams.get("edition") ?? "2027");
  const yearResult = editionYearSchema.safeParse(rawYear);
  const year = yearResult.success ? yearResult.data : 2027;

  const disable = searchParams.get("disable") === "1";
  const draft = await draftMode();

  if (disable) {
    draft.disable();
  } else {
    draft.enable();
  }

  const targetPath = resolveSafeRedirectPath(
    searchParams.get("redirect"),
    year
  );
  return NextResponse.redirect(new URL(targetPath, request.url));
}
