export interface SupabasePublicEnv {
  url: string;
  publishableKey: string;
}

/**
 * Returns `true` when both `NEXT_PUBLIC_SUPABASE_URL` (valid http/https URL)
 * and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured in the environment.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (!url || !publishableKey) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Reads and validates the public Supabase connection environment variables
 * (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
 */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured yet (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). See docs/operations/supabase-handoff.md."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid http:// or https:// URL."
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must use http:// or https:// protocol."
    );
  }

  return { url, publishableKey };
}

/**
 * Reads the server-only `SUPABASE_SECRET_KEY` (`sb_secret_...`).
 * Throws if invoked in a browser environment or if the key is missing.
 */
export function getSupabaseSecretKey(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "SUPABASE_SECRET_KEY is server-only and cannot be accessed in the browser."
    );
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not configured. See docs/operations/supabase-handoff.md."
    );
  }

  return secretKey;
}
