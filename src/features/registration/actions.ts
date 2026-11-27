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
import { canPublishFinancialRecord } from "@/lib/permissions/rbac";
import { createServerSupabase } from "@/lib/supabase/server";
import { editionYearSchema } from "@/lib/validation/common";
import {
  type PaymentInstructionsInput,
  type RegistrationFeeInput,
  paymentInstructionsSchema,
  registrationFeeSchema,
} from "./schemas";

/**
 * Creates or updates a registration fee tier. Saving directly into
 * `published` or `archived` requires financial approval permission.
 */
export async function upsertRegistrationFeeAction(
  feeId: string | null,
  input: RegistrationFeeInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = registrationFeeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          parsed.error.issues[0]?.message ?? "Invalid registration fee input.",
      };
    }

    const data = parsed.data;
    const supabase = await createServerSupabase();

    if (feeId) {
      const { data: beforeRow, error: lookupError } = await supabase
        .from("registration_fees")
        .select("*")
        .eq("id", feeId)
        .maybeSingle();

      if (lookupError) return { ok: false, error: lookupError.message };
      if (!beforeRow) return { ok: false, error: "Registration fee not found." };
      if (beforeRow.edition_id !== data.editionId) {
        return {
          ok: false,
          error: "Registration fee does not belong to the selected edition.",
        };
      }

      const permissionError = checkStatusPermission(
        actor,
        "registration_fees",
        data.status,
        beforeRow.status
      );
      if (permissionError) return { ok: false, error: permissionError };

      const approvedMeta =
        data.status === "published"
          ? {
              financial_approved_by: actor.userId,
              financial_approved_at: new Date().toISOString(),
            }
          : {};

      const { data: afterRow, error: updateError } = await supabase
        .from("registration_fees")
        .update({
          category: data.category,
          amount_inr: data.amountInr,
          amount_usd: data.amountUsd,
          indian_display: data.indianDisplay || null,
          foreign_display: data.foreignDisplay || null,
          tax_note: data.taxNote || null,
          sort_order: data.sortOrder,
          status: data.status,
          ...approvedMeta,
        })
        .eq("id", feeId)
        .select("*")
        .single();

      if (updateError || !afterRow) {
        return {
          ok: false,
          error: updateError?.message ?? "Failed to update registration fee.",
        };
      }

      await recordVersionAndAudit({
        supabase,
        actor,
        action: "update",
        tableName: "registration_fees",
        recordId: afterRow.id,
        beforeData: beforeRow as unknown as Json,
        afterData: afterRow as unknown as Json,
      });

      const editionYear =
        data.editionYear ?? (await resolveEditionYear(supabase, data.editionId));
      if (editionYear) revalidateEdition(editionYear);
      return { ok: true, id: afterRow.id };
    }

    const permissionError = checkStatusPermission(
      actor,
      "registration_fees",
      data.status
    );
    if (permissionError) return { ok: false, error: permissionError };

    const approvedMeta =
      data.status === "published"
        ? {
            financial_approved_by: actor.userId,
            financial_approved_at: new Date().toISOString(),
          }
        : {};

    const { data: insertedRow, error: insertError } = await supabase
      .from("registration_fees")
      .insert({
        edition_id: data.editionId,
        category: data.category,
        amount_inr: data.amountInr,
        amount_usd: data.amountUsd,
        indian_display: data.indianDisplay || null,
        foreign_display: data.foreignDisplay || null,
        tax_note: data.taxNote || null,
        sort_order: data.sortOrder,
        status: data.status,
        ...approvedMeta,
      })
      .select("*")
      .single();

    if (insertError || !insertedRow) {
      return {
        ok: false,
        error: insertError?.message ?? "Failed to create registration fee.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "create",
      tableName: "registration_fees",
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

/**
 * Publishes a registration fee — strictly gated by `requireFinancialApproval: true`.
 */
export async function publishRegistrationFeeAction(
  feeId: string,
  editionYear: number
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession({
      requireFinancialApproval: true,
    });

    const parsedYear = editionYearSchema.safeParse(editionYear);
    if (!parsedYear.success || !feeId.trim()) {
      return { ok: false, error: "Valid fee ID and edition year are required." };
    }

    const supabase = await createServerSupabase();

    const { data: beforeRow, error: lookupError } = await supabase
      .from("registration_fees")
      .select("*")
      .eq("id", feeId.trim())
      .maybeSingle();

    if (lookupError) return { ok: false, error: lookupError.message };
    if (!beforeRow) return { ok: false, error: "Registration fee not found." };

    const { data: afterRow, error: updateError } = await supabase
      .from("registration_fees")
      .update({
        status: "published",
        financial_approved_by: actor.userId,
        financial_approved_at: new Date().toISOString(),
      })
      .eq("id", beforeRow.id)
      .select("*")
      .single();

    if (updateError || !afterRow) {
      return {
        ok: false,
        error: updateError?.message ?? "Failed to publish registration fee.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "publish",
      tableName: "registration_fees",
      recordId: beforeRow.id,
      beforeData: beforeRow as unknown as Json,
      afterData: afterRow as unknown as Json,
    });

    revalidateEdition(parsedYear.data);
    return { ok: true, id: beforeRow.id };
  } catch (error) {
    return mapActionError(error);
  }
}

/**
 * Updates bank transfer / UPI / policy instructions on the edition's primary
 * registration fee row — gated by `requireFinancialApproval: true`.
 */
export async function updatePaymentInstructionsAction(
  editionId: string,
  editionYear: number,
  input: PaymentInstructionsInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession({
      requireFinancialApproval: true,
    });

    const parsedYear = editionYearSchema.safeParse(editionYear);
    const parsed = paymentInstructionsSchema.safeParse(input);
    if (!parsedYear.success || !parsed.success) {
      return {
        ok: false,
        error:
          parsed.success
            ? "Valid edition year is required."
            : parsed.error.issues[0]?.message ?? "Invalid payment instructions.",
      };
    }

    const supabase = await createServerSupabase();
    const { data: rows, error: listErr } = await supabase
      .from("registration_fees")
      .select("*")
      .eq("edition_id", editionId)
      .order("sort_order", { ascending: true })
      .limit(1);

    if (listErr) return { ok: false, error: listErr.message };
    if (!rows || rows.length === 0) {
      return {
        ok: false,
        error: "Create at least one registration fee tier before saving payment details.",
      };
    }

    const target = rows[0];
    const { data: afterRow, error: updateErr } = await supabase
      .from("registration_fees")
      .update({
        payment_instructions: parsed.data as unknown as Json,
        financial_approved_by: actor.userId,
        financial_approved_at: new Date().toISOString(),
      })
      .eq("id", target.id)
      .select("*")
      .single();

    if (updateErr || !afterRow) {
      return {
        ok: false,
        error: updateErr?.message ?? "Failed to update payment instructions.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "update",
      tableName: "registration_fees",
      recordId: target.id,
      beforeData: target as unknown as Json,
      afterData: afterRow as unknown as Json,
    });

    revalidateEdition(parsedYear.data);
    return { ok: true, id: target.id };
  } catch (error) {
    return mapActionError(error);
  }
}

export async function deleteRegistrationFeeAction(
  feeId: string,
  editionYear: number
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsedYear = editionYearSchema.safeParse(editionYear);
    if (!parsedYear.success || !feeId.trim()) {
      return { ok: false, error: "Valid fee ID and edition year are required." };
    }

    const supabase = await createServerSupabase();

    const { data: beforeRow, error: lookupError } = await supabase
      .from("registration_fees")
      .select("*")
      .eq("id", feeId.trim())
      .maybeSingle();

    if (lookupError) return { ok: false, error: lookupError.message };
    if (!beforeRow) return { ok: false, error: "Registration fee not found." };

    const permissionError = checkStatusPermission(
      actor,
      "registration_fees",
      "draft",
      beforeRow.status
    );
    if (permissionError) return { ok: false, error: permissionError };

    if (
      beforeRow.status !== "draft" &&
      !canPublishFinancialRecord({
        role: actor.role,
        canApproveFinancial: actor.canApproveFinancial,
      })
    ) {
      return {
        ok: false,
        error: "Deleting non-draft registration fees requires financial approval.",
      };
    }

    const { error: deleteError } = await supabase
      .from("registration_fees")
      .delete()
      .eq("id", beforeRow.id);

    if (deleteError) return { ok: false, error: deleteError.message };

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "delete",
      tableName: "registration_fees",
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
