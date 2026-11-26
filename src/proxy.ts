import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Copies refreshed Supabase auth cookies onto a redirect response so token
 * rotation is never lost across redirects.
 */
function redirectWithCookies(
  targetUrl: URL,
  sourceResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(targetUrl);
  for (const cookie of sourceResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

/**
 * Next.js 16 request proxy guarding `/admin/:path*`:
 * - When Supabase is not configured yet, redirects `/admin/*` (except `/admin/login`) cleanly to `/admin/login`.
 * - Refreshes session cookies via `supabase.auth.getClaims()`.
 * - Redirects unauthenticated requests to `/admin/login`.
 * - Redirects authenticated `aal1` requests (except `/admin/mfa`) to `/admin/mfa`.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  if (!isSupabaseConfigured()) {
    if (pathname === "/admin/login") {
      return NextResponse.next({ request });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  let supabaseResponse = NextResponse.next({ request });
  const { url, publishableKey } = getSupabasePublicEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  let claims: { sub?: string; aal?: string } | null = null;
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error && data?.claims) {
      claims = data.claims;
    }
  } catch {
    // Gracefully degrade to unauthenticated if Supabase URL is unreachable or misconfigured
    claims = null;
  }

  if (!claims?.sub) {
    if (pathname === "/admin/login") {
      return supabaseResponse;
    }
    return redirectWithCookies(
      new URL("/admin/login", request.url),
      supabaseResponse
    );
  }

  if (claims.aal !== "aal2") {
    if (pathname === "/admin/mfa") {
      return supabaseResponse;
    }
    return redirectWithCookies(
      new URL("/admin/mfa", request.url),
      supabaseResponse
    );
  }

  if (
    pathname === "/admin" ||
    pathname === "/admin/login" ||
    pathname === "/admin/mfa"
  ) {
    return redirectWithCookies(
      new URL("/admin/overview", request.url),
      supabaseResponse
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*"],
};
