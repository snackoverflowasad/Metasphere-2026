"use server";

import type { Json, PublicationStatus } from "@/types/database";
import { requireAdminSession } from "@/lib/auth/session";
import { revalidateEdition } from "@/lib/cache/tags";
import {
  type ActionResult,
  type PublishableTable,
  checkStatusPermission,
  mapActionError,
  recordVersionAndAudit,
} from "@/lib/cms/mutations";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  type EditionSettingsInput,
  publishContentSchema,
  updateEditionSettingsSchema,
} from "./schemas";

/**
 * Updates conference edition metadata and SEO/canonical `site_settings`
 * after verifying AAL2 admin session, RBAC permissions, and IST/URL constraints.
 */
export async function updateEditionSettingsAction(
  editionId: string,
  input: EditionSettingsInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const trimmedEditionId = editionId.trim();
    if (!trimmedEditionId) {
      return { ok: false, error: "Edition ID is required." };
    }

    const parsed = updateEditionSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          parsed.error.issues[0]?.message ?? "Invalid edition settings input.",
      };
    }

    const data = parsed.data;
    const supabase = await createServerSupabase();

    const { data: beforeEdition, error: lookupError } = await supabase
      .from("conference_editions")
      .select("*")
      .eq("id", trimmedEditionId)
      .maybeSingle();

    if (lookupError) {
      return { ok: false, error: lookupError.message };
    }
    if (!beforeEdition) {
      return { ok: false, error: "Conference edition not found." };
    }

    const permissionError = checkStatusPermission(
      actor,
      "conference_editions",
      beforeEdition.status,
      beforeEdition.status
    );
    if (permissionError) {
      return { ok: false, error: permissionError };
    }

    if (data.isActive && !beforeEdition.is_active) {
      if (actor.role === "editor") {
        return {
          ok: false,
          error: "Only content_admin or super_admin may switch the active edition.",
        };
      }
      const { error: deactivateError } = await supabase
        .from("conference_editions")
        .update({ is_active: false })
        .neq("id", trimmedEditionId)
        .eq("is_active", true);

      if (deactivateError) {
        return { ok: false, error: deactivateError.message };
      }
    }

    const { data: afterEdition, error: updateError } = await supabase
      .from("conference_editions")
      .update({
        title: data.title,
        subtitle: data.subtitle || null,
        tagline: data.tagline || null,
        loader_subtitle: data.loaderSubtitle || null,
        dates_display: data.datesDisplay,
        start_date: data.startDate,
        end_date: data.endDate,
        timezone: data.timezone,
        venue_name: data.venueName,
        venue_address: data.venueAddress || null,
        venue_city: data.venueCity || null,
        format: data.format,
        description: data.description || null,
        technical_co_sponsors_summary: data.technicalCoSponsorsSummary ?? null,
        cmt_acknowledgment: data.cmtAcknowledgment ?? null,
        publication_note: data.publicationNote ?? null,
        contact_emails: data.contactEmails,
        contact_phones: data.contactPhones,
        ...(typeof data.isActive === "boolean"
          ? { is_active: data.isActive }
          : {}),
      })
      .eq("id", trimmedEditionId)
      .select("*")
      .single();

    if (updateError || !afterEdition) {
      return {
        ok: false,
        error: updateError?.message ?? "Failed to update conference edition.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "update",
      tableName: "conference_editions",
      recordId: trimmedEditionId,
      beforeData: beforeEdition as unknown as Json,
      afterData: afterEdition as unknown as Json,
    });

    const { data: beforeSettings } = await supabase
      .from("site_settings")
      .select("*")
      .eq("edition_id", trimmedEditionId)
      .maybeSingle();

    const { data: afterSettings, error: settingsError } = await supabase
      .from("site_settings")
      .upsert(
        {
          edition_id: trimmedEditionId,
          canonical_url: data.canonicalUrl,
          seo_title: data.seoTitle,
          seo_description: data.seoDescription,
          status: beforeSettings?.status ?? beforeEdition.status,
        },
        { onConflict: "edition_id" }
      )
      .select("*")
      .single();

    if (settingsError || !afterSettings) {
      return {
        ok: false,
        error: settingsError?.message ?? "Failed to update site settings.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: beforeSettings ? "update" : "create",
      tableName: "site_settings",
      recordId: afterSettings.id,
      beforeData: (beforeSettings ?? null) as unknown as Json | null,
      afterData: afterSettings as unknown as Json,
    });

    revalidateEdition(data.editionYear);
    return { ok: true, id: trimmedEditionId };
  } catch (error) {
    return mapActionError(error);
  }
}

/**
 * Transitions a CMS record across `draft`, `published`, or `archived` statuses.
 * Only `content_admin` and `super_admin` may publish or archive content.
 */
export async function publishContentAction(
  table: PublishableTable,
  id: string,
  editionYear: number,
  nextStatus: PublicationStatus
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = publishContentSchema.safeParse({
      table,
      id,
      editionYear,
      nextStatus,
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid publish request.",
      };
    }

    const { table: validTable, id: recordId, editionYear: year, nextStatus: targetStatus } =
      parsed.data;

    const initialPermissionError = checkStatusPermission(
      actor,
      validTable,
      targetStatus
    );
    if (initialPermissionError) {
      return { ok: false, error: initialPermissionError };
    }

    const supabase = await createServerSupabase();
    // All 12 PublishableTable entries share `id` and `status` columns.
    const typedTable = validTable as "deadlines";

    const { data: beforeRow, error: lookupError } = await supabase
      .from(typedTable)
      .select("*")
      .eq("id", recordId)
      .maybeSingle();

    if (lookupError) {
      return { ok: false, error: lookupError.message };
    }
    if (!beforeRow) {
      return { ok: false, error: "Record not found." };
    }

    const currentStatus = (beforeRow as { status: PublicationStatus }).status;
    const transitionError = checkStatusPermission(
      actor,
      validTable,
      targetStatus,
      currentStatus
    );
    if (transitionError) {
      return { ok: false, error: transitionError };
    }

    const { data: afterRow, error: updateError } = await supabase
      .from(typedTable)
      .update({ status: targetStatus })
      .eq("id", recordId)
      .select("*")
      .single();

    if (updateError || !afterRow) {
      return {
        ok: false,
        error: updateError?.message ?? "Failed to update publication status.",
      };
    }

    const auditAction =
      targetStatus === "published"
        ? "publish"
        : targetStatus === "archived"
          ? "archive"
          : "draft";

    await recordVersionAndAudit({
      supabase,
      actor,
      action: auditAction,
      tableName: validTable,
      recordId,
      beforeData: beforeRow as unknown as Json,
      afterData: afterRow as unknown as Json,
    });

    revalidateEdition(year);
    return { ok: true, id: recordId };
  } catch (error) {
    return mapActionError(error);
  }
}
