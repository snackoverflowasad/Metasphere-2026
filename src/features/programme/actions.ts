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
import { IST_TIMEZONE } from "@/lib/dates/ist";
import { createServerSupabase } from "@/lib/supabase/server";
import { editionYearSchema } from "@/lib/validation/common";
import {
  type ProgramSessionInput,
  type TrackInput,
  programSessionInputSchema,
  trackInputSchema,
} from "./schemas";

function deriveIstSessionDate(startsAt: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(startsAt));
}

export async function upsertTrackAction(
  trackId: string | null,
  input: TrackInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = trackInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid track input.",
      };
    }

    const data = parsed.data;
    const supabase = await createServerSupabase();

    if (trackId) {
      const { data: beforeRow, error: lookupError } = await supabase
        .from("tracks")
        .select("*")
        .eq("id", trackId)
        .maybeSingle();

      if (lookupError) return { ok: false, error: lookupError.message };
      if (!beforeRow) return { ok: false, error: "Track not found." };
      if (beforeRow.edition_id !== data.editionId) {
        return { ok: false, error: "Track does not belong to the selected edition." };
      }

      const permissionError = checkStatusPermission(
        actor,
        "tracks",
        data.status,
        beforeRow.status
      );
      if (permissionError) return { ok: false, error: permissionError };

      const { data: afterRow, error: updateError } = await supabase
        .from("tracks")
        .update({
          code: data.code,
          name: data.name,
          description: data.description || null,
          topics: data.topics as unknown as Json,
          image_url: data.imageUrl || null,
          sort_order: data.sortOrder,
          status: data.status,
        })
        .eq("id", trackId)
        .select("*")
        .single();

      if (updateError || !afterRow) {
        return {
          ok: false,
          error: updateError?.message ?? "Failed to update track.",
        };
      }

      await recordVersionAndAudit({
        supabase,
        actor,
        action: "update",
        tableName: "tracks",
        recordId: afterRow.id,
        beforeData: beforeRow as unknown as Json,
        afterData: afterRow as unknown as Json,
      });

      const editionYear =
        data.editionYear ?? (await resolveEditionYear(supabase, data.editionId));
      if (editionYear) revalidateEdition(editionYear);
      return { ok: true, id: afterRow.id };
    }

    const permissionError = checkStatusPermission(actor, "tracks", data.status);
    if (permissionError) return { ok: false, error: permissionError };

    const { data: insertedRow, error: insertError } = await supabase
      .from("tracks")
      .insert({
        edition_id: data.editionId,
        code: data.code,
        name: data.name,
        description: data.description || null,
        topics: data.topics as unknown as Json,
        image_url: data.imageUrl || null,
        sort_order: data.sortOrder,
        status: data.status,
      })
      .select("*")
      .single();

    if (insertError || !insertedRow) {
      return {
        ok: false,
        error: insertError?.message ?? "Failed to create track.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "create",
      tableName: "tracks",
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

export async function deleteTrackAction(
  trackId: string,
  editionYear: number
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();
    const parsedYear = editionYearSchema.safeParse(editionYear);
    if (!parsedYear.success || !trackId.trim()) {
      return { ok: false, error: "Valid track ID and edition year are required." };
    }

    const supabase = await createServerSupabase();
    const { data: beforeRow, error: lookupError } = await supabase
      .from("tracks")
      .select("*")
      .eq("id", trackId.trim())
      .maybeSingle();

    if (lookupError) return { ok: false, error: lookupError.message };
    if (!beforeRow) return { ok: false, error: "Track not found." };

    const permissionError = checkStatusPermission(
      actor,
      "tracks",
      "draft",
      beforeRow.status
    );
    if (permissionError) return { ok: false, error: permissionError };

    const { error: deleteError } = await supabase
      .from("tracks")
      .delete()
      .eq("id", beforeRow.id);

    if (deleteError) return { ok: false, error: deleteError.message };

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "delete",
      tableName: "tracks",
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

export async function upsertSessionAction(
  sessionId: string | null,
  input: ProgramSessionInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = programSessionInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid session input.",
      };
    }

    const data = parsed.data;
    const sessionDate = data.sessionDate || deriveIstSessionDate(data.startsAt);
    const supabase = await createServerSupabase();

    if (sessionId) {
      const { data: beforeRow, error: lookupError } = await supabase
        .from("program_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();

      if (lookupError) return { ok: false, error: lookupError.message };
      if (!beforeRow) return { ok: false, error: "Session not found." };
      if (beforeRow.edition_id !== data.editionId) {
        return { ok: false, error: "Session does not belong to the selected edition." };
      }

      const permissionError = checkStatusPermission(
        actor,
        "program_sessions",
        data.status,
        beforeRow.status
      );
      if (permissionError) return { ok: false, error: permissionError };

      const { data: afterRow, error: updateError } = await supabase
        .from("program_sessions")
        .update({
          track_id: data.trackId ?? null,
          speaker_id: data.speakerId ?? null,
          session_date: sessionDate,
          starts_at: data.startsAt,
          ends_at: data.endsAt,
          title: data.title,
          description: data.description || null,
          room_or_link: data.roomOrLink || null,
          sort_order: data.sortOrder,
          status: data.status,
        })
        .eq("id", sessionId)
        .select("*")
        .single();

      if (updateError || !afterRow) {
        return {
          ok: false,
          error: updateError?.message ?? "Failed to update session.",
        };
      }

      await recordVersionAndAudit({
        supabase,
        actor,
        action: "update",
        tableName: "program_sessions",
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
      "program_sessions",
      data.status
    );
    if (permissionError) return { ok: false, error: permissionError };

    const { data: insertedRow, error: insertError } = await supabase
      .from("program_sessions")
      .insert({
        edition_id: data.editionId,
        track_id: data.trackId ?? null,
        speaker_id: data.speakerId ?? null,
        session_date: sessionDate,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
        title: data.title,
        description: data.description || null,
        room_or_link: data.roomOrLink || null,
        sort_order: data.sortOrder,
        status: data.status,
      })
      .select("*")
      .single();

    if (insertError || !insertedRow) {
      return {
        ok: false,
        error: insertError?.message ?? "Failed to create session.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "create",
      tableName: "program_sessions",
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

export async function deleteSessionAction(
  sessionId: string,
  editionYear: number
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();
    const parsedYear = editionYearSchema.safeParse(editionYear);
    if (!parsedYear.success || !sessionId.trim()) {
      return { ok: false, error: "Valid session ID and edition year are required." };
    }

    const supabase = await createServerSupabase();
    const { data: beforeRow, error: lookupError } = await supabase
      .from("program_sessions")
      .select("*")
      .eq("id", sessionId.trim())
      .maybeSingle();

    if (lookupError) return { ok: false, error: lookupError.message };
    if (!beforeRow) return { ok: false, error: "Session not found." };

    const permissionError = checkStatusPermission(
      actor,
      "program_sessions",
      "draft",
      beforeRow.status
    );
    if (permissionError) return { ok: false, error: permissionError };

    const { error: deleteError } = await supabase
      .from("program_sessions")
      .delete()
      .eq("id", beforeRow.id);

    if (deleteError) return { ok: false, error: deleteError.message };

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "delete",
      tableName: "program_sessions",
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
