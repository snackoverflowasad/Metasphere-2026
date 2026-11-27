"use server";

import type { Json } from "@/types/database";
import { requireAdminSession } from "@/lib/auth/session";
import { type ActionResult, mapActionError } from "@/lib/cms/mutations";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation/common";
import {
  type InviteAdminUserInput,
  type UpdateAdminRoleInput,
  inviteAdminUserSchema,
  updateAdminRoleSchema,
} from "./schemas";

/**
 * Invites a new conference committee admin user by email (`super_admin` only)
 * using the privileged server-only Supabase admin client.
 */
export async function inviteAdminUserAction(
  input: InviteAdminUserInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession({
      requiredRoles: ["super_admin"],
    });

    const parsed = inviteAdminUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid invite input.",
      };
    }

    const data = parsed.data;
    const adminSupabase = createAdminSupabase();

    const { data: inviteData, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(data.email, {
        data: {
          role: data.role,
          canApproveFinancial: data.canApproveFinancial,
        },
      });

    if (inviteError || !inviteData?.user) {
      return {
        ok: false,
        error: inviteError?.message ?? "Failed to send invite.",
      };
    }

    const userId = inviteData.user.id;

    const { error: upsertErr } = await adminSupabase.from("admin_roles").upsert(
      {
        user_id: userId,
        email: data.email,
        display_name: data.displayName || null,
        role: data.role,
        can_approve_financial: data.canApproveFinancial,
        is_active: true,
      },
      { onConflict: "user_id" }
    );

    if (upsertErr) {
      return { ok: false, error: upsertErr.message };
    }

    const { error: auditErr } = await adminSupabase.from("audit_logs").insert({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: "invite",
      table_name: "admin_roles",
      record_id: userId,
      before_data: null,
      after_data: {
        email: data.email,
        display_name: data.displayName || null,
        role: data.role,
        can_approve_financial: data.canApproveFinancial,
      },
    });

    if (auditErr) {
      return { ok: false, error: auditErr.message };
    }

    return { ok: true, id: userId };
  } catch (error) {
    return mapActionError(error);
  }
}

/**
 * Updates an administrator's role, financial approval permission, or active state
 * (`super_admin` only). Prevents locking out the currently signed-in super_admin.
 */
export async function updateAdminRoleAction(
  input: UpdateAdminRoleInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession({
      requiredRoles: ["super_admin"],
    });

    const parsed = updateAdminRoleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid role update input.",
      };
    }

    const data = parsed.data;
    if (data.userId === actor.userId && (!data.isActive || data.role !== "super_admin")) {
      return {
        ok: false,
        error: "You cannot demote or deactivate your own super_admin account.",
      };
    }

    const adminSupabase = createAdminSupabase();

    const { data: beforeRow, error: lookupError } = await adminSupabase
      .from("admin_roles")
      .select("*")
      .eq("user_id", data.userId)
      .maybeSingle();

    if (lookupError) {
      return { ok: false, error: lookupError.message };
    }
    if (!beforeRow) {
      return { ok: false, error: "Administrator record not found." };
    }

    const { error: updateError } = await adminSupabase
      .from("admin_roles")
      .update({
        ...(data.displayName ? { display_name: data.displayName } : {}),
        role: data.role,
        can_approve_financial: data.canApproveFinancial,
        is_active: data.isActive,
      })
      .eq("user_id", data.userId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    if (!data.isActive || beforeRow.role !== data.role) {
      await adminSupabase.auth.admin.signOut(data.userId).catch(() => undefined);
    }

    await adminSupabase.from("audit_logs").insert({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: "update",
      table_name: "admin_roles",
      record_id: data.userId,
      before_data: beforeRow as unknown as Json,
      after_data: {
        role: data.role,
        can_approve_financial: data.canApproveFinancial,
        is_active: data.isActive,
      },
    });

    return { ok: true, id: data.userId };
  } catch (error) {
    return mapActionError(error);
  }
}

/**
 * Deactivates an administrator (`super_admin` only), preventing self-lockout.
 */
export async function deactivateAdminUserAction(
  userId: string
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession({
      requiredRoles: ["super_admin"],
    });

    const parsedUserId = uuidSchema("Valid user UUID is required.").safeParse(userId);
    if (!parsedUserId.success) {
      return {
        ok: false,
        error: parsedUserId.error.issues[0]?.message ?? "Valid user UUID is required.",
      };
    }
    const trimmed = parsedUserId.data;
    if (trimmed === actor.userId) {
      return { ok: false, error: "You cannot deactivate your own account." };
    }

    const adminSupabase = createAdminSupabase();
    const { data: beforeRow, error: lookupError } = await adminSupabase
      .from("admin_roles")
      .select("*")
      .eq("user_id", trimmed)
      .maybeSingle();

    if (lookupError) {
      return { ok: false, error: lookupError.message };
    }
    if (!beforeRow) {
      return { ok: false, error: "Administrator record not found." };
    }

    const { error: updateError } = await adminSupabase
      .from("admin_roles")
      .update({ is_active: false })
      .eq("user_id", trimmed);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    await adminSupabase.auth.admin.signOut(trimmed).catch(() => undefined);

    await adminSupabase.from("audit_logs").insert({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: "archive",
      table_name: "admin_roles",
      record_id: trimmed,
      before_data: beforeRow as unknown as Json,
      after_data: { is_active: false },
    });

    return { ok: true, id: trimmed };
  } catch (error) {
    return mapActionError(error);
  }
}
