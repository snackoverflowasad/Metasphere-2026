"use server";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { type AdminContext, requireAdminSession } from "@/lib/auth/session";
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
import {
  type CommitteeInput,
  type CommitteeMemberInput,
  type SpeakerInput,
  committeeInputSchema,
  committeeMemberInputSchema,
  speakerInputSchema,
} from "./schemas";

function buildPersonSlug(fullName: string): string {
  const base = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return `${base || "person"}-${randomUUID().slice(0, 6)}`;
}

async function upsertPersonRecord(params: {
  supabase: SupabaseClient<Database>;
  actor: AdminContext;
  personId?: string;
  fullName: string;
  designation: string;
  institution: string;
  country: string;
  photoUrl: string;
  bio?: string;
}): Promise<{ ok: true; personId: string } | { ok: false; error: string }> {
  const {
    supabase,
    actor,
    personId,
    fullName,
    designation,
    institution,
    country,
    photoUrl,
    bio = "",
  } = params;

  if (personId) {
    const { data: beforePerson, error: personLookupErr } = await supabase
      .from("people")
      .select("*")
      .eq("id", personId)
      .maybeSingle();

    if (personLookupErr) {
      return { ok: false, error: personLookupErr.message };
    }
    if (!beforePerson) {
      return { ok: false, error: "Linked person record not found." };
    }

    const { data: afterPerson, error: personUpdateErr } = await supabase
      .from("people")
      .update({
        full_name: fullName,
        designation: designation || null,
        institution: institution || null,
        country: country || null,
        photo_url: photoUrl || null,
        ...(bio ? { bio } : {}),
      })
      .eq("id", personId)
      .select("*")
      .single();

    if (personUpdateErr || !afterPerson) {
      return {
        ok: false,
        error: personUpdateErr?.message ?? "Failed to update person profile.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "update",
      tableName: "people",
      recordId: afterPerson.id,
      beforeData: beforePerson as unknown as Json,
      afterData: afterPerson as unknown as Json,
    });

    return { ok: true, personId: afterPerson.id };
  }

  const { data: insertedPerson, error: personInsertErr } = await supabase
    .from("people")
    .insert({
      slug: buildPersonSlug(fullName),
      full_name: fullName,
      designation: designation || null,
      institution: institution || null,
      country: country || null,
      photo_url: photoUrl || null,
      bio: bio || null,
    })
    .select("*")
    .single();

  if (personInsertErr || !insertedPerson) {
    return {
      ok: false,
      error: personInsertErr?.message ?? "Failed to create person profile.",
    };
  }

  await recordVersionAndAudit({
    supabase,
    actor,
    action: "create",
    tableName: "people",
    recordId: insertedPerson.id,
    beforeData: null,
    afterData: insertedPerson as unknown as Json,
  });

  return { ok: true, personId: insertedPerson.id };
}

/**
 * Creates or updates a speaker and their underlying `people` profile, enforcing
 * AAL2 session, RBAC status permissions, content versioning, and audit logging.
 */
export async function upsertSpeakerAction(
  speakerId: string | null,
  input: SpeakerInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = speakerInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid speaker input.",
      };
    }

    const data = parsed.data;
    const supabase = await createServerSupabase();

    if (speakerId) {
      const { data: beforeRow, error: lookupError } = await supabase
        .from("speakers")
        .select("*")
        .eq("id", speakerId)
        .maybeSingle();

      if (lookupError) return { ok: false, error: lookupError.message };
      if (!beforeRow) return { ok: false, error: "Speaker not found." };
      if (beforeRow.edition_id !== data.editionId) {
        return { ok: false, error: "Speaker does not belong to the selected edition." };
      }

      const permissionError = checkStatusPermission(
        actor,
        "speakers",
        data.status,
        beforeRow.status
      );
      if (permissionError) return { ok: false, error: permissionError };

      const personResult = await upsertPersonRecord({
        supabase,
        actor,
        personId: data.personId ?? beforeRow.person_id,
        fullName: data.fullName,
        designation: data.designation,
        institution: data.institution,
        country: data.country,
        photoUrl: data.photoUrl,
        bio: data.bio,
      });
      if (!personResult.ok) return personResult;

      const { data: afterRow, error: updateError } = await supabase
        .from("speakers")
        .update({
          person_id: personResult.personId,
          speaker_type: data.speakerType,
          talk_title: data.talkTitle || null,
          talk_abstract: data.talkAbstract || null,
          image_alt: data.imageAlt || null,
          sort_order: data.sortOrder,
          status: data.status,
        })
        .eq("id", speakerId)
        .select("*")
        .single();

      if (updateError || !afterRow) {
        return {
          ok: false,
          error: updateError?.message ?? "Failed to update speaker.",
        };
      }

      await recordVersionAndAudit({
        supabase,
        actor,
        action: "update",
        tableName: "speakers",
        recordId: afterRow.id,
        beforeData: beforeRow as unknown as Json,
        afterData: afterRow as unknown as Json,
      });

      const editionYear =
        data.editionYear ?? (await resolveEditionYear(supabase, data.editionId));
      if (editionYear) revalidateEdition(editionYear);
      return { ok: true, id: afterRow.id };
    }

    const permissionError = checkStatusPermission(actor, "speakers", data.status);
    if (permissionError) return { ok: false, error: permissionError };

    const personResult = await upsertPersonRecord({
      supabase,
      actor,
      personId: data.personId,
      fullName: data.fullName,
      designation: data.designation,
      institution: data.institution,
      country: data.country,
      photoUrl: data.photoUrl,
      bio: data.bio,
    });
    if (!personResult.ok) return personResult;

    const { data: insertedRow, error: insertError } = await supabase
      .from("speakers")
      .insert({
        edition_id: data.editionId,
        person_id: personResult.personId,
        speaker_type: data.speakerType,
        talk_title: data.talkTitle || null,
        talk_abstract: data.talkAbstract || null,
        image_alt: data.imageAlt || null,
        sort_order: data.sortOrder,
        status: data.status,
      })
      .select("*")
      .single();

    if (insertError || !insertedRow) {
      return {
        ok: false,
        error: insertError?.message ?? "Failed to create speaker.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "create",
      tableName: "speakers",
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

export async function deleteSpeakerAction(
  speakerId: string,
  editionYear: number
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();
    const parsedYear = editionYearSchema.safeParse(editionYear);
    if (!parsedYear.success || !speakerId.trim()) {
      return { ok: false, error: "Valid speaker ID and edition year are required." };
    }

    const supabase = await createServerSupabase();
    const { data: beforeRow, error: lookupError } = await supabase
      .from("speakers")
      .select("*")
      .eq("id", speakerId.trim())
      .maybeSingle();

    if (lookupError) return { ok: false, error: lookupError.message };
    if (!beforeRow) return { ok: false, error: "Speaker not found." };

    const permissionError = checkStatusPermission(
      actor,
      "speakers",
      "draft",
      beforeRow.status
    );
    if (permissionError) return { ok: false, error: permissionError };

    const { error: deleteError } = await supabase
      .from("speakers")
      .delete()
      .eq("id", beforeRow.id);

    if (deleteError) return { ok: false, error: deleteError.message };

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "delete",
      tableName: "speakers",
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

/**
 * Creates or updates a committee section for an edition.
 */
export async function upsertCommitteeAction(
  committeeId: string | null,
  input: CommitteeInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = committeeInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid committee input.",
      };
    }

    const data = parsed.data;
    const supabase = await createServerSupabase();

    if (committeeId) {
      const { data: beforeRow, error: lookupError } = await supabase
        .from("committees")
        .select("*")
        .eq("id", committeeId)
        .maybeSingle();

      if (lookupError) return { ok: false, error: lookupError.message };
      if (!beforeRow) return { ok: false, error: "Committee not found." };
      if (beforeRow.edition_id !== data.editionId) {
        return { ok: false, error: "Committee does not belong to the selected edition." };
      }

      const permissionError = checkStatusPermission(
        actor,
        "committees",
        data.status,
        beforeRow.status
      );
      if (permissionError) return { ok: false, error: permissionError };

      const { data: afterRow, error: updateError } = await supabase
        .from("committees")
        .update({
          slug: data.slug,
          name: data.name,
          category: data.category,
          description: data.description || null,
          sort_order: data.sortOrder,
          status: data.status,
        })
        .eq("id", committeeId)
        .select("*")
        .single();

      if (updateError || !afterRow) {
        return {
          ok: false,
          error: updateError?.message ?? "Failed to update committee.",
        };
      }

      await recordVersionAndAudit({
        supabase,
        actor,
        action: "update",
        tableName: "committees",
        recordId: afterRow.id,
        beforeData: beforeRow as unknown as Json,
        afterData: afterRow as unknown as Json,
      });

      const editionYear =
        data.editionYear ?? (await resolveEditionYear(supabase, data.editionId));
      if (editionYear) revalidateEdition(editionYear);
      return { ok: true, id: afterRow.id };
    }

    const permissionError = checkStatusPermission(actor, "committees", data.status);
    if (permissionError) return { ok: false, error: permissionError };

    const { data: insertedRow, error: insertError } = await supabase
      .from("committees")
      .insert({
        edition_id: data.editionId,
        slug: data.slug,
        name: data.name,
        category: data.category,
        description: data.description || null,
        sort_order: data.sortOrder,
        status: data.status,
      })
      .select("*")
      .single();

    if (insertError || !insertedRow) {
      return {
        ok: false,
        error: insertError?.message ?? "Failed to create committee.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "create",
      tableName: "committees",
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

export async function deleteCommitteeAction(
  committeeId: string,
  editionYear: number
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();
    const parsedYear = editionYearSchema.safeParse(editionYear);
    if (!parsedYear.success || !committeeId.trim()) {
      return { ok: false, error: "Valid committee ID and edition year are required." };
    }

    const supabase = await createServerSupabase();
    const { data: beforeRow, error: lookupError } = await supabase
      .from("committees")
      .select("*")
      .eq("id", committeeId.trim())
      .maybeSingle();

    if (lookupError) return { ok: false, error: lookupError.message };
    if (!beforeRow) return { ok: false, error: "Committee not found." };

    const permissionError = checkStatusPermission(
      actor,
      "committees",
      "draft",
      beforeRow.status
    );
    if (permissionError) return { ok: false, error: permissionError };

    const { error: deleteError } = await supabase
      .from("committees")
      .delete()
      .eq("id", beforeRow.id);

    if (deleteError) return { ok: false, error: deleteError.message };

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "delete",
      tableName: "committees",
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

/**
 * Creates or updates a committee member and their linked `people` profile.
 */
export async function upsertCommitteeMemberAction(
  memberId: string | null,
  input: CommitteeMemberInput
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();

    const parsed = committeeMemberInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          parsed.error.issues[0]?.message ?? "Invalid committee member input.",
      };
    }

    const data = parsed.data;
    const supabase = await createServerSupabase();

    if (memberId) {
      const { data: beforeRow, error: lookupError } = await supabase
        .from("committee_members")
        .select("*")
        .eq("id", memberId)
        .maybeSingle();

      if (lookupError) return { ok: false, error: lookupError.message };
      if (!beforeRow) return { ok: false, error: "Committee member not found." };

      const permissionError = checkStatusPermission(
        actor,
        "committee_members",
        data.status,
        beforeRow.status
      );
      if (permissionError) return { ok: false, error: permissionError };

      const personResult = await upsertPersonRecord({
        supabase,
        actor,
        personId: data.personId ?? beforeRow.person_id,
        fullName: data.fullName,
        designation: data.designation,
        institution: data.institution,
        country: data.country,
        photoUrl: data.photoUrl,
      });
      if (!personResult.ok) return personResult;

      const { data: afterRow, error: updateError } = await supabase
        .from("committee_members")
        .update({
          committee_id: data.committeeId,
          person_id: personResult.personId,
          role_label: data.roleLabel,
          group_name: data.groupName,
          nationality_group: data.nationalityGroup,
          sort_order: data.sortOrder,
          status: data.status,
        })
        .eq("id", memberId)
        .select("*")
        .single();

      if (updateError || !afterRow) {
        return {
          ok: false,
          error: updateError?.message ?? "Failed to update committee member.",
        };
      }

      await recordVersionAndAudit({
        supabase,
        actor,
        action: "update",
        tableName: "committee_members",
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
      "committee_members",
      data.status
    );
    if (permissionError) return { ok: false, error: permissionError };

    const personResult = await upsertPersonRecord({
      supabase,
      actor,
      personId: data.personId,
      fullName: data.fullName,
      designation: data.designation,
      institution: data.institution,
      country: data.country,
      photoUrl: data.photoUrl,
    });
    if (!personResult.ok) return personResult;

    const { data: insertedRow, error: insertError } = await supabase
      .from("committee_members")
      .insert({
        committee_id: data.committeeId,
        person_id: personResult.personId,
        role_label: data.roleLabel,
        group_name: data.groupName,
        nationality_group: data.nationalityGroup,
        sort_order: data.sortOrder,
        status: data.status,
      })
      .select("*")
      .single();

    if (insertError || !insertedRow) {
      return {
        ok: false,
        error: insertError?.message ?? "Failed to create committee member.",
      };
    }

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "create",
      tableName: "committee_members",
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

export async function deleteCommitteeMemberAction(
  memberId: string,
  editionYear: number
): Promise<ActionResult> {
  try {
    const actor = await requireAdminSession();
    const parsedYear = editionYearSchema.safeParse(editionYear);
    if (!parsedYear.success || !memberId.trim()) {
      return { ok: false, error: "Valid member ID and edition year are required." };
    }

    const supabase = await createServerSupabase();
    const { data: beforeRow, error: lookupError } = await supabase
      .from("committee_members")
      .select("*")
      .eq("id", memberId.trim())
      .maybeSingle();

    if (lookupError) return { ok: false, error: lookupError.message };
    if (!beforeRow) return { ok: false, error: "Committee member not found." };

    const permissionError = checkStatusPermission(
      actor,
      "committee_members",
      "draft",
      beforeRow.status
    );
    if (permissionError) return { ok: false, error: permissionError };

    const { error: deleteError } = await supabase
      .from("committee_members")
      .delete()
      .eq("id", beforeRow.id);

    if (deleteError) return { ok: false, error: deleteError.message };

    await recordVersionAndAudit({
      supabase,
      actor,
      action: "delete",
      tableName: "committee_members",
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
