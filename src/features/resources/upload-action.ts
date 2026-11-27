"use server";

import { requireAdminSession } from "@/lib/auth/session";
import { type ActionResult, mapActionError } from "@/lib/cms/mutations";
import { createServerSupabase } from "@/lib/supabase/server";
import { editionYearSchema, validateUploadFile } from "@/lib/validation/common";

/**
 * Uploads a conference asset (PNG, JPEG, WEBP, or PDF up to 10 MB) to
 * Supabase Storage using the authenticated `aal2` user session (so bucket RLS
 * applies) and writes an entry in `audit_logs`.
 */
export async function uploadConferenceAssetAction(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  try {
    const actor = await requireAdminSession();

    const file = formData.get("file");
    const bucket = formData.get("bucket");
    const rawYear = Number(formData.get("editionYear"));

    if (!(file instanceof File)) {
      return { ok: false, error: "No file provided." };
    }
    if (
      typeof bucket !== "string" ||
      (bucket !== "conference-public" && bucket !== "conference-private")
    ) {
      return {
        ok: false,
        error:
          "Invalid bucket. Must be conference-public or conference-private.",
      };
    }

    const parsedYear = editionYearSchema.safeParse(rawYear);
    if (!parsedYear.success) {
      return { ok: false, error: "Invalid edition year." };
    }

    const validation = validateUploadFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const sanitisedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_");
    const path = `${parsedYear.data}/${Date.now()}-${sanitisedName}`;

    const supabase = await createServerSupabase();
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, error: uploadError.message };
    }

    let resolvedUrl = path;
    if (bucket === "conference-public") {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      resolvedUrl = urlData.publicUrl;
    } else {
      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);
      resolvedUrl = signedData?.signedUrl ?? path;
    }

    const { error: auditErr } = await supabase.from("audit_logs").insert({
      actor_id: actor.userId,
      actor_role: actor.role,
      action: "upload",
      table_name: "storage.objects",
      record_id: null,
      before_data: null,
      after_data: {
        bucket,
        path,
        mimeType: file.type,
        size: file.size,
      },
    });

    if (auditErr) {
      return { ok: false, error: `Uploaded file, but audit log failed: ${auditErr.message}` };
    }

    return {
      ok: true,
      data: {
        url: resolvedUrl,
        path,
      },
    };
  } catch (error) {
    return mapActionError(error);
  }
}
