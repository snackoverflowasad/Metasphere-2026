import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabasePublicEnv } from "./config";

/**
 * Creates a request-scoped SSR Supabase client bound to Next.js cookies
 * using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
 */
export async function createServerSupabase(): Promise<SupabaseClient<Database>> {
  const { url, publishableKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot mutate response cookies; `src/proxy.ts`
          // refreshes session cookies on incoming requests.
        }
      },
    },
  });
}
