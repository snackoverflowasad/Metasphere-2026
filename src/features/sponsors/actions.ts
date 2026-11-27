"use server";

import type { Json } from "@/types/database";
import { requireAdminSession } from "@/lib/auth/session";
import { revalidateEdition } from "@/lib/cache/tags";
import {
  type ActionResult,
  checkStatusPermission,
  mapActionError,
  recordVersionAndAudit,
  resolveEditionYear,
} from "@/lib/cms/mutations";
import { createServerSupabase } from "@/lib/supabase/server";
import { editionYearSchema } from "@/lib/validation/common";
import { type SponsorInput, sponsorInputSchema } from "./schemas";

export async function upsertSponsorAction(
  sponsorId: string | null,
  input: SponsorInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = sponsorInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid sponsor input.",
      };
    }

    const data = parsed.data;
    const supabase = await createServerSupabase();

    if (sponsorId) {
      const { data: beforeRow, error: lookupError } = await supabase
        .from("sponsors")
        .select("*")
        .eq("id", sponsorId)
        .maybeSingle();

      if (lookupError) return { ok: false, error: lookupError.message };
      if (!beforeRow) return { ok: false, error: "Sponsor not found." };
      if (beforeRow.edition_id !== data.editionId) {
        return { ok: false, error: "Sponsor does not belong to the selected edition." };
      }

      const permissionError = checkStatusPermission(
        actor,
        "sponsors",
        data.status,
        beforeRow.status
      );
      if (permissionError) return { ok: false, error: permissionError };

      const { data: afterRow, error: updateError } = await supabase
        .from("sponsors")
        .update({
          name: data.name,
          tier: data.tier,
          logo_url: data.logoUrl,
          website_url: data.websiteUrl || null,
          description: data.description || null,
          sort_order: data.sortOrder,
          status: data.status,
        })
        .eq("id", sponsorId)
        .select("*")
        .single();

      if (updateError || !afterRow) {
        return {
          ok: false,
          error: updateError?.message ?? "Failed to update sponsor.",
        };
      }

      await recordVersionAndAudit({
        supabase,
        actor,
        action: "update",
        tableName: "sponsors",
        recordId: afterRow.id,
        beforeData: beforeRow as unknown as Json,
        afterData: afterRow as unknown as Json,
      });

      const editionYear =
        data.editionYear ?? (await resolveEditionYear(supabase, data.editionId));
      if (editionYear) revalidateEdition(editionYear);
      return { ok: true, id: afterRow.id };
    }

    const permissionError = checkStatusPermission(actor, "sponsors", data.status);
    if (permissionError) return { ok: false, error: permissionError };

    const { data: insertedRow, error: insertError } = await supabase
      .from("sponsors")
      .insert({
        edition_id: data.editionId,
        name: data.name,
        tier: data.tier,
        logo_url: data.logoUrl,
        website_url: data.websiteUrl || null,
        description: data.description || null,
        sort_order: data.sortOrder,
        status: data.status,
      })
      .select("*")
      .single();

    if (insertError || !insertedRow) {
      return {
        ok: false,
        error: insertError?.message ?? "Failed to create sponsor.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "create",
      tableName: "sponsors",
      recordId: insertedRow.id,
      beforeData: null,
      afterData: insertedRow as unknown as Json,
    });

    const editionYear =
      data.editionYear ?? (await resolveEditionYear(supabase, data.editionId));
    if (editionYear) revalidateEdition(editionYear);
    return { ok: true, id: insertedRow.id };
  } catch (error) {
    return mapActionError(error);
  }
}

export async function deleteSponsorAction(
  sponsorId: string,
  editionYear: number
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();
    const parsedYear = editionYearSchema.safeParse(editionYear);
    if (!parsedYear.success || !sponsorId.trim()) {
      return { ok: false, error: "Valid sponsor ID and edition year are required." };
    }

    const supabase = await createServerSupabase();
    const { data: beforeRow, error: lookupError } = await supabase
      .from("sponsors")
      .select("*")
      .eq("id", sponsorId.trim())
      .maybeSingle();

    if (lookupError) return { ok: false, error: lookupError.message };
    if (!beforeRow) return { ok: false, error: "Sponsor not found." };

    const permissionError = checkStatusPermission(
      actor,
      "sponsors",
      "draft",
      beforeRow.status
    );
    if (permissionError) return { ok: false, error: permissionError };

    const { error: deleteError } = await supabase
      .from("sponsors")
      .delete()
      .eq("id", beforeRow.id);

    if (deleteError) return { ok: false, error: deleteError.message };

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "delete",
      tableName: "sponsors",
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
