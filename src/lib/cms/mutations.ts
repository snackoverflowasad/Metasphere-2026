import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, PublicationStatus } from "@/types/database";
import { AdminAuthError, type AdminContext } from "@/lib/auth/session";
import { canPerform } from "@/lib/permissions/rbac";

export type ActionResult<T = undefined> = T extends undefined
  ? { ok: true; id?: string } | { ok: false; error: string }
  : { ok: true; id?: string; data: T } | { ok: false; error: string };

export type PublishableTable =
  | "conference_editions"
  | "site_settings"
  | "deadlines"
  | "tracks"
  | "speakers"
  | "committees"
  | "committee_members"
  | "sponsors"
  | "program_sessions"
  | "resources"
  | "conference_links"
  | "registration_fees";

/**
 * Maps internal authentication, RBAC, or database errors to safe ActionResult errors.
 */
export function mapActionError(error: unknown): { ok: false; error: string } {
  if (error instanceof AdminAuthError) {
    if (error.code === "NOT_CONFIGURED") {
      return { ok: false, error: "Supabase is not configured yet." };
    }
    return { ok: false, error: error.message };
  }

  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }

  return { ok: false, error: "An unexpected error occurred." };
}

/**
 * Verifies whether `actor` may save or transition a record into `nextStatus`
 * and whether an existing non-draft record may be modified by an editor.
 */
export function checkStatusPermission(
  actor: AdminContext,
  table: PublishableTable,
  nextStatus: PublicationStatus,
  currentStatus?: PublicationStatus | null
): string | null {
  if (!canPerform(actor.role, "edit_draft")) {
    return "You do not have permission to edit CMS content.";
  }

  if (
    actor.role === "editor" &&
    currentStatus &&
    currentStatus !== "draft"
  ) {
    return "Editors can only modify draft records. Ask a content_admin or super_admin.";
  }

  if (nextStatus === "published") {
    if (!canPerform(actor.role, "publish_content")) {
      return "Only content_admin or super_admin may publish content.";
    }
    if (
      table === "registration_fees" &&
      !canPerform(actor.role, "publish_financial", {
        canApproveFinancial: actor.canApproveFinancial,
      })
    ) {
      return "Publishing registration fees requires financial approval permission.";
    }
  }

  if (nextStatus === "archived") {
    if (!canPerform(actor.role, "archive_content")) {
      return "Only content_admin or super_admin may archive content.";
    }
    if (
      table === "registration_fees" &&
      !canPerform(actor.role, "publish_financial", {
        canApproveFinancial: actor.canApproveFinancial,
      })
    ) {
      return "Archiving registration fees requires financial approval permission.";
    }
  }

  return null;
}

/**
 * Appends a version snapshot into `content_versions` and an audit entry into `audit_logs`.
 */
export async function recordVersionAndAudit(params: {
  supabase: SupabaseClient<Database>;
  actor: AdminContext;
  action: "create" | "update" | "delete" | "publish" | "archive" | "draft";
  tableName: PublishableTable | "people";
  recordId: string;
  beforeData: Json | null;
  afterData: Json | null;
}): Promise<void> {
  const { supabase, actor, action, tableName, recordId, beforeData, afterData } =
    params;

  if (afterData !== null) {
    const { data: latestVersion, error: versionLookupError } = await supabase
      .from("content_versions")
      .select("version_number")
      .eq("table_name", tableName)
      .eq("record_id", recordId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle<{ version_number: number }>();

    if (versionLookupError) {
      throw new Error(
        `Failed to query content version history: ${versionLookupError.message}`
      );
    }

    const nextVersion = (latestVersion?.version_number ?? 0) + 1;
    const { error: versionInsertError } = await supabase
      .from("content_versions")
      .insert({
        table_name: tableName,
        record_id: recordId,
        version_number: nextVersion,
        snapshot: afterData,
        created_by: actor.userId,
      });

    if (versionInsertError) {
      throw new Error(
        `Failed to record content version: ${versionInsertError.message}`
      );
    }
  }

  const { error: auditInsertError } = await supabase.from("audit_logs").insert({
    actor_id: actor.userId,
    actor_role: actor.role,
    action,
    table_name: tableName,
    record_id: recordId,
    before_data: beforeData,
    after_data: afterData,
  });

  if (auditInsertError) {
    throw new Error(`Failed to write audit log: ${auditInsertError.message}`);
  }
}

/**
 * Resolves the integer edition year for cache tag revalidation from an edition UUID.
 */
export async function resolveEditionYear(
  supabase: SupabaseClient<Database>,
  editionId: string
): Promise<number | null> {
  try {
    const { data } = await supabase
      .from("conference_editions")
      .select("year")
      .eq("id", editionId)
      .maybeSingle<{ year: number }>();
    return data?.year ?? null;
  } catch {
    return null;
  }
}
