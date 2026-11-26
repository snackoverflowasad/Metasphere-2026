"use server";

import type { Json } from "@/types/database";
import { requireAdminSession } from "@/lib/auth/session";
import { revalidateEdition } from "@/lib/cache/tags";
import {
  type ActionResult,
  checkStatusPermission,
  mapActionError,
  recordVersionAndAudit,
} from "@/lib/cms/mutations";
import { createServerSupabase } from "@/lib/supabase/server";
import { editionYearSchema } from "@/lib/validation/common";
import { type DeadlineInput, deadlineInputSchema } from "./schemas";

/**
 * Creates or updates a conference deadline in `deadlines` with IST timestamps,
 * RBAC enforcement, version snapshots, and audit logging.
 */
export async function upsertDeadlineAction(
  input: DeadlineInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = deadlineInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid deadline input.",
      };
    }

    const data = parsed.data;
    const supabase = await createServerSupabase();

    if (data.id) {
      const { data: beforeRow, error: lookupError } = await supabase
        .from("deadlines")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();

      if (lookupError) {
        return { ok: false, error: lookupError.message };
      }
      if (!beforeRow) {
        return { ok: false, error: "Deadline record not found." };
      }
      if (beforeRow.edition_id !== data.editionId) {
        return {
          ok: false,
          error: "Deadline does not belong to the selected edition.",
        };
      }

      const permissionError = checkStatusPermission(
        actor,
        "deadlines",
        data.status,
        beforeRow.status
      );
      if (permissionError) {
        return { ok: false, error: permissionError };
      }

      const { data: afterRow, error: updateError } = await supabase
        .from("deadlines")
        .update({
          title: data.title,
          due_at: data.dueAt,
          display_date: data.displayDate,
          original_date: data.originalDate ?? null,
          is_extended: data.isExtended,
          is_conference_date: data.isConferenceDate,
          sort_order: data.sortOrder,
          is_visible: data.isVisible,
          status: data.status,
        })
        .eq("id", data.id)
        .select("*")
        .single();

      if (updateError || !afterRow) {
        return {
          ok: false,
          error: updateError?.message ?? "Failed to update deadline.",
        };
      }

      await recordVersionAndAudit({
        supabase,
        actor,
        action: "update",
        tableName: "deadlines",
        recordId: afterRow.id,
        beforeData: beforeRow as unknown as Json,
        afterData: afterRow as unknown as Json,
      });

      revalidateEdition(data.editionYear);
      return { ok: true, id: afterRow.id };
    }

    const permissionError = checkStatusPermission(
      actor,
      "deadlines",
      data.status
    );
    if (permissionError) {
      return { ok: false, error: permissionError };
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from("deadlines")
      .insert({
        edition_id: data.editionId,
        title: data.title,
        due_at: data.dueAt,
        display_date: data.displayDate,
        original_date: data.originalDate ?? null,
        is_extended: data.isExtended,
        is_conference_date: data.isConferenceDate,
        sort_order: data.sortOrder,
        is_visible: data.isVisible,
        status: data.status,
      })
      .select("*")
      .single();

    if (insertError || !insertedRow) {
      return {
        ok: false,
        error: insertError?.message ?? "Failed to create deadline.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "create",
      tableName: "deadlines",
      recordId: insertedRow.id,
      beforeData: null,
      afterData: insertedRow as unknown as Json,
    });

    revalidateEdition(data.editionYear);
    return { ok: true, id: insertedRow.id };
  } catch (error) {
    return mapActionError(error);
  }
}

/**
 * Deletes a deadline row after verifying RBAC (editors may only delete drafts)
 * and recording an audit trail entry.
 */
export async function deleteDeadlineAction(
  id: string,
  editionYear: number
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsedYear = editionYearSchema.safeParse(editionYear);
    if (!parsedYear.success || !id.trim()) {
      return { ok: false, error: "Valid deadline ID and edition year are required." };
    }

    const supabase = await createServerSupabase();
    const { data: beforeRow, error: lookupError } = await supabase
      .from("deadlines")
      .select("*")
      .eq("id", id.trim())
      .maybeSingle();

    if (lookupError) {
      return { ok: false, error: lookupError.message };
    }
    if (!beforeRow) {
      return { ok: false, error: "Deadline record not found." };
    }

    const permissionError = checkStatusPermission(
      actor,
      "deadlines",
      "draft",
      beforeRow.status
    );
    if (permissionError) {
      return { ok: false, error: permissionError };
    }

    const { error: deleteError } = await supabase
      .from("deadlines")
      .delete()
      .eq("id", beforeRow.id);

    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "delete",
      tableName: "deadlines",
      recordId: beforeRow.id,
      beforeData: beforeRow as unknown as Json,
      afterData: null,
    });

    revalidateEdition(parsedYear.data);
    return { ok: true, id: beforeRow.id };
  } catch (error) {
    return mapActionError(error);
  }
}
