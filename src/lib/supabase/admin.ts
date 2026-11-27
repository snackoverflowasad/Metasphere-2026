import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabasePublicEnv, getSupabaseSecretKey } from "./config";

/**
 * Creates a privileged server-only Supabase admin client using `SUPABASE_SECRET_KEY`.
 * Never import or invoke this module from client components.
 */
export function createAdminSupabase(): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminSupabase() cannot be executed in a browser environment."
    );
  }

  const { url } = getSupabasePublicEnv();
  const secretKey = getSupabaseSecretKey();

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
