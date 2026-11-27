import type { AdminRole } from "@/types/database";

export type { AdminRole };

export type AdminAction =
  | "view_admin"
  | "edit_draft"
  | "upload_asset"
  | "publish_content"
  | "archive_content"
  | "publish_financial"
  | "manage_users"
  | "view_audit_logs";

const ROLE_ALLOWED_ACTIONS: Record<AdminRole, ReadonlySet<AdminAction>> = {
  editor: new Set<AdminAction>([
    "view_admin",
    "edit_draft",
    "upload_asset",
    "view_audit_logs",
  ]),
  content_admin: new Set<AdminAction>([
    "view_admin",
    "edit_draft",
    "upload_asset",
    "publish_content",
    "archive_content",
    "view_audit_logs",
  ]),
  super_admin: new Set<AdminAction>([
    "view_admin",
    "edit_draft",
    "upload_asset",
    "publish_content",
    "archive_content",
    "publish_financial",
    "manage_users",
    "view_audit_logs",
  ]),
};

/**
 * Evaluates whether an active administrator with `role` and optional permission flags
 * is authorized to execute `action`.
 */
export function canPerform(
  role: AdminRole,
  action: AdminAction,
  flags?: { canApproveFinancial?: boolean }
): boolean {
  if (action === "publish_financial") {
    return canPublishFinancialRecord({
      role,
      canApproveFinancial: Boolean(flags?.canApproveFinancial),
    });
  }

  return ROLE_ALLOWED_ACTIONS[role].has(action);
}

/**
 * Enforces that publishing financial records (fees, bank/UPI payment details)
 * requires either `super_admin` or `content_admin` with `canApproveFinancial: true`.
 */
export function canPublishFinancialRecord(actor: {
  role: AdminRole;
  canApproveFinancial: boolean;
}): boolean {
  if (actor.role === "super_admin") {
    return true;
  }

  return actor.role === "content_admin" && actor.canApproveFinancial === true;
}
