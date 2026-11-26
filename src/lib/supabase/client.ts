import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabasePublicEnv } from "./config";

/**
 * Creates a browser Supabase client authenticated with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
 */
export function createBrowserSupabase(): SupabaseClient<Database> {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
