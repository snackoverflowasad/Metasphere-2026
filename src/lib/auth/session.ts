import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminRole, Database } from "@/types/database";
import { canPublishFinancialRecord } from "@/lib/permissions/rbac";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export type AdminAuthErrorCode =
  | "NOT_CONFIGURED"
  | "UNAUTHENTICATED"
  | "MFA_REQUIRED"
  | "FORBIDDEN";

export class AdminAuthError extends Error {
  readonly code: AdminAuthErrorCode;

  constructor(code: AdminAuthErrorCode, message: string) {
    super(message);
    this.name = "AdminAuthError";
    this.code = code;
  }
}

export interface AdminContext {
  userId: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
  canApproveFinancial: boolean;
  aal: "aal1" | "aal2";
}

export interface RequireAdminSessionOptions {
  requiredRoles?: AdminRole[];
  requireFinancialApproval?: boolean;
}

interface AdminRoleRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: AdminRole;
  can_approve_financial: boolean;
  is_active: boolean;
}

/**
 * Resolves the authenticated `aal2` admin context from the current SSR session,
 * or returns `null` when Supabase is unconfigured, unauthenticated, at `aal1`,
 * or missing an active `admin_roles` assignment.
 */
export async function getAdminContext(
  clientOverride?: SupabaseClient<Database>
): Promise<AdminContext | null> {
  try {
    return await requireAdminSession(undefined, clientOverride);
  } catch {
    return null;
  }
}

/**
 * Enforces an authenticated `aal2` (TOTP MFA-verified) active administrator session
 * with optional role and financial-approval checks. Throws `AdminAuthError` on failure.
 */
export async function requireAdminSession(
  options?: RequireAdminSessionOptions,
  clientOverride?: SupabaseClient<Database>
): Promise<AdminContext> {
  if (!isSupabaseConfigured()) {
    throw new AdminAuthError(
      "NOT_CONFIGURED",
      "Supabase is not configured yet. See docs/operations/supabase-handoff.md."
    );
  }

  const supabase = clientOverride ?? (await createServerSupabase());
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub) {
    throw new AdminAuthError(
      "UNAUTHENTICATED",
      "Authentication required to access admin tools."
    );
  }

  if (claims.aal !== "aal2") {
    throw new AdminAuthError(
      "MFA_REQUIRED",
      "TOTP MFA verification (aal2) is required to access admin tools."
    );
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("admin_roles")
    .select(
      "user_id, email, display_name, role, can_approve_financial, is_active"
    )
    .eq("user_id", claims.sub)
    .eq("is_active", true)
    .maybeSingle<AdminRoleRow>();

  if (roleError || !roleRow || !roleRow.is_active) {
    throw new AdminAuthError(
      "FORBIDDEN",
      "Active administrator role assignment is required."
    );
  }

  const context: AdminContext = {
    userId: claims.sub,
    email: claims.email ?? roleRow.email ?? "",
    displayName: roleRow.display_name,
    role: roleRow.role,
    canApproveFinancial: Boolean(roleRow.can_approve_financial),
    aal: "aal2",
  };

  if (
    options?.requiredRoles &&
    options.requiredRoles.length > 0 &&
    !options.requiredRoles.includes(context.role)
  ) {
    throw new AdminAuthError(
      "FORBIDDEN",
      `Insufficient role permissions. Required role: ${options.requiredRoles.join(" or ")}.`
    );
  }

  if (
    options?.requireFinancialApproval &&
    !canPublishFinancialRecord({
      role: context.role,
      canApproveFinancial: context.canApproveFinancial,
    })
  ) {
    throw new AdminAuthError(
      "FORBIDDEN",
      "Financial approval permission is required for this action."
    );
  }

  return context;
}

/**
 * Page-level Server Component session guard that redirects `MFA_REQUIRED`
 * to `/admin/mfa` and all other `AdminAuthError` failures to `/admin/login`.
 */
export async function requireAdminPageSession(
  options?: RequireAdminSessionOptions
): Promise<AdminContext> {
  try {
    return await requireAdminSession(options);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      if (error.code === "MFA_REQUIRED") {
        redirect("/admin/mfa");
      }
      redirect("/admin/login");
    }
    throw error;
  }
}
