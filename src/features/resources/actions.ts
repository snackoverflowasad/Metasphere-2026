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
import {
  type ConferenceLinkInput,
  type ResourceInput,
  conferenceLinkSchema,
  resourceInputSchema,
} from "./schemas";

/**
 * Creates or updates a validated external conference link (`conference_links`)
 * enforcing `http://` / `https://` URLs, RBAC, versioning, and audit logging.
 */
export async function upsertConferenceLinkAction(
  input: ConferenceLinkInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = conferenceLinkSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          parsed.error.issues[0]?.message ?? "Invalid conference link input.",
      };
    }

    const data = parsed.data;
    const supabase = await createServerSupabase();

    if (data.id) {
      const { data: beforeRow, error: lookupError } = await supabase
        .from("conference_links")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();

      if (lookupError) {
        return { ok: false, error: lookupError.message };
      }
      if (!beforeRow) {
        return { ok: false, error: "Conference link not found." };
      }
      if (beforeRow.edition_id !== data.editionId) {
        return {
          ok: false,
          error: "Conference link does not belong to the selected edition.",
        };
      }

      const permissionError = checkStatusPermission(
        actor,
        "conference_links",
        data.status,
        beforeRow.status
      );
      if (permissionError) {
        return { ok: false, error: permissionError };
      }

      const { data: afterRow, error: updateError } = await supabase
        .from("conference_links")
        .update({
          key: data.key,
          label: data.label,
          url: data.url,
          status: data.status,
        })
        .eq("id", data.id)
        .select("*")
        .single();

      if (updateError || !afterRow) {
        return {
          ok: false,
          error: updateError?.message ?? "Failed to update conference link.",
        };
      }

      await recordVersionAndAudit({
        supabase,
        actor,
        action: "update",
        tableName: "conference_links",
        recordId: afterRow.id,
        beforeData: beforeRow as unknown as Json,
        afterData: afterRow as unknown as Json,
      });

      revalidateEdition(data.editionYear);
      return { ok: true, id: afterRow.id };
    }

    const { data: existingByKey } = await supabase
      .from("conference_links")
      .select("*")
      .eq("edition_id", data.editionId)
      .eq("key", data.key)
      .maybeSingle();

    const permissionError = checkStatusPermission(
      actor,
      "conference_links",
      data.status,
      existingByKey?.status ?? null
    );
    if (permissionError) {
      return { ok: false, error: permissionError };
    }

    const { data: upsertedRow, error: upsertError } = await supabase
      .from("conference_links")
      .upsert(
        {
          edition_id: data.editionId,
          key: data.key,
          label: data.label,
          url: data.url,
          status: data.status,
        },
        { onConflict: "edition_id,key" }
      )
      .select("*")
      .single();

    if (upsertError || !upsertedRow) {
      return {
        ok: false,
        error: upsertError?.message ?? "Failed to save conference link.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: existingByKey ? "update" : "create",
      tableName: "conference_links",
      recordId: upsertedRow.id,
      beforeData: (existingByKey ?? null) as unknown as Json | null,
      afterData: upsertedRow as unknown as Json,
    });

    revalidateEdition(data.editionYear);
    return { ok: true, id: upsertedRow.id };
  } catch (error) {
    return mapActionError(error);
  }
}

/**
 * Creates or updates a downloadable template or brochure in `resources`.
 */
export async function upsertResourceAction(
  input: ResourceInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = resourceInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid resource input.",
      };
    }

    const data = parsed.data;
    const supabase = await createServerSupabase();

    if (data.id) {
      const { data: beforeRow, error: lookupError } = await supabase
        .from("resources")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();

      if (lookupError) {
        return { ok: false, error: lookupError.message };
      }
      if (!beforeRow) {
        return { ok: false, error: "Resource not found." };
      }
      if (beforeRow.edition_id !== data.editionId) {
        return {
          ok: false,
          error: "Resource does not belong to the selected edition.",
        };
      }

      const permissionError = checkStatusPermission(
        actor,
        "resources",
        data.status,
        beforeRow.status
      );
      if (permissionError) {
        return { ok: false, error: permissionError };
      }

      const { data: afterRow, error: updateError } = await supabase
        .from("resources")
        .update({
          label: data.label,
          category: data.category,
          url: data.url,
          storage_path: data.storagePath,
          sort_order: data.sortOrder,
          status: data.status,
        })
        .eq("id", data.id)
        .select("*")
        .single();

      if (updateError || !afterRow) {
        return {
          ok: false,
          error: updateError?.message ?? "Failed to update resource.",
        };
      }

      await recordVersionAndAudit({
        supabase,
        actor,
        action: "update",
        tableName: "resources",
        recordId: afterRow.id,
        beforeData: beforeRow as unknown as Json,
        afterData: afterRow as unknown as Json,
      });

      revalidateEdition(data.editionYear);
      return { ok: true, id: afterRow.id };
    }

    const permissionError = checkStatusPermission(
      actor,
      "resources",
      data.status
    );
    if (permissionError) {
      return { ok: false, error: permissionError };
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from("resources")
      .insert({
        edition_id: data.editionId,
        label: data.label,
        category: data.category,
        url: data.url,
        storage_path: data.storagePath,
        sort_order: data.sortOrder,
        status: data.status,
      })
      .select("*")
      .single();

    if (insertError || !insertedRow) {
      return {
        ok: false,
        error: insertError?.message ?? "Failed to create resource.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "create",
      tableName: "resources",
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
