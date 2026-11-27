import "server-only";
import type {
  AdminRole,
  CommitteeCategory,
  CommitteeMemberSnapshot,
  CommitteeSnapshot,
  Database,
  PaymentInstructions,
  ProgramSessionSnapshot,
  PublicationStatus,
  RegistrationFeeSnapshot,
  SpeakerSnapshot,
  SponsorSnapshot,
  TrackSnapshot,
} from "@/types/database";
import { getFallbackEditionSnapshot } from "@/lib/fallback/seed-snapshot";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export interface AdminModuleContext {
  source: "database" | "fallback";
  editionId: string;
  editionYear: number;
  editionSubtitle: string;
}

export interface AdminUserRecord {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: AdminRole;
  canApproveFinancial: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogPage {
  source: "database" | "fallback";
  page: number;
  pageSize: number;
  totalCount: number;
  logs: Database["public"]["Tables"]["audit_logs"]["Row"][];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parsePaymentInstructions(
  raw: unknown,
  fallback: PaymentInstructions
): PaymentInstructions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }
  const obj = raw as Record<string, unknown>;
  const bank =
    obj.bankTransfer && typeof obj.bankTransfer === "object"
      ? (obj.bankTransfer as Record<string, unknown>)
      : {};
  return {
    taxNote: typeof obj.taxNote === "string" ? obj.taxNote : fallback.taxNote,
    paymentMethodsNote:
      typeof obj.paymentMethodsNote === "string"
        ? obj.paymentMethodsNote
        : fallback.paymentMethodsNote,
    upiId: typeof obj.upiId === "string" ? obj.upiId : fallback.upiId,
    bankTransfer: {
      bankName:
        typeof bank.bankName === "string"
          ? bank.bankName
          : fallback.bankTransfer.bankName,
      partyName:
        typeof bank.partyName === "string"
          ? bank.partyName
          : fallback.bankTransfer.partyName,
      accountNo:
        typeof bank.accountNo === "string"
          ? bank.accountNo
          : fallback.bankTransfer.accountNo,
      accountType:
        typeof bank.accountType === "string"
          ? bank.accountType
          : fallback.bankTransfer.accountType,
      ifscCode:
        typeof bank.ifscCode === "string"
          ? bank.ifscCode
          : fallback.bankTransfer.ifscCode,
      branch:
        typeof bank.branch === "string" ? bank.branch : fallback.bankTransfer.branch,
      swiftCode:
        typeof bank.swiftCode === "string"
          ? bank.swiftCode
          : fallback.bankTransfer.swiftCode,
      micr: typeof bank.micr === "string" ? bank.micr : fallback.bankTransfer.micr,
    },
    policies: Array.isArray(obj.policies)
      ? obj.policies.filter((p): p is string => typeof p === "string")
      : fallback.policies,
    confirmationEmailInstruction:
      typeof obj.confirmationEmailInstruction === "string"
        ? obj.confirmationEmailInstruction
        : fallback.confirmationEmailInstruction,
    cancellationPolicy:
      typeof obj.cancellationPolicy === "string"
        ? obj.cancellationPolicy
        : fallback.cancellationPolicy,
  };
}

async function resolveEditionHeader(requestedYear?: number): Promise<{
  context: AdminModuleContext;
  supabase: Awaited<ReturnType<typeof createServerSupabase>> | null;
}> {
  const year = requestedYear === 2026 ? 2026 : requestedYear ?? 2027;
  const fallback = getFallbackEditionSnapshot(year === 2026 ? 2026 : 2027);
  const fallbackContext: AdminModuleContext = {
    source: "fallback",
    editionId: `fallback-edition-${fallback.edition.year}`,
    editionYear: fallback.edition.year,
    editionSubtitle: fallback.edition.subtitle,
  };

  if (!isSupabaseConfigured()) {
    return { context: fallbackContext, supabase: null };
  }

  try {
    const supabase = await createServerSupabase();
    const { data: editionRow } = await supabase
      .from("conference_editions")
      .select("id, year, subtitle")
      .eq("year", year)
      .maybeSingle();

    if (!editionRow) {
      return { context: fallbackContext, supabase: null };
    }

    return {
      context: {
        source: "database",
        editionId: editionRow.id,
        editionYear: editionRow.year,
        editionSubtitle: editionRow.subtitle ?? `MetaSphere ${editionRow.year}`,
      },
      supabase,
    };
  } catch {
    return { context: fallbackContext, supabase: null };
  }
}

export async function loadAdminSpeakersData(requestedYear?: number): Promise<{
  context: AdminModuleContext;
  speakers: SpeakerSnapshot[];
}> {
  const { context, supabase } = await resolveEditionHeader(requestedYear);
  const fallback = getFallbackEditionSnapshot(
    context.editionYear === 2026 ? 2026 : 2027
  );

  if (!supabase || context.source === "fallback") {
    return { context, speakers: fallback.speakers };
  }

  const { data: rows } = await supabase
    .from("speakers")
    .select(
      "id, person_id, speaker_type, talk_title, talk_abstract, image_alt, sort_order, status, people ( id, full_name, designation, institution, country, photo_url )"
    )
    .eq("edition_id", context.editionId)
    .order("sort_order", { ascending: true });

  const speakers: SpeakerSnapshot[] = (rows ?? []).map((row) => {
    const person = Array.isArray(row.people) ? row.people[0] : row.people;
    const institution =
      typeof person?.institution === "string" ? person.institution : "";
    return {
      id: row.id,
      personId: row.person_id,
      fullName: person?.full_name ?? "Unnamed Speaker",
      designation: person?.designation ?? "",
      institution,
      affiliations: institution
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
      country: person?.country ?? null,
      photoUrl: person?.photo_url ?? "",
      imageAlt: row.image_alt ?? person?.full_name ?? "Speaker photo",
      speakerType: row.speaker_type,
      talkTitle: row.talk_title,
      talkAbstract: row.talk_abstract,
      sortOrder: row.sort_order,
      status: row.status as PublicationStatus,
    };
  });

  return { context, speakers };
}

export async function loadAdminCommitteesData(requestedYear?: number): Promise<{
  context: AdminModuleContext;
  committees: CommitteeSnapshot[];
}> {
  const { context, supabase } = await resolveEditionHeader(requestedYear);
  const fallback = getFallbackEditionSnapshot(
    context.editionYear === 2026 ? 2026 : 2027
  );

  if (!supabase || context.source === "fallback") {
    return { context, committees: fallback.committees };
  }

  const { data: committeesRows } = await supabase
    .from("committees")
    .select("*")
    .eq("edition_id", context.editionId)
    .order("sort_order", { ascending: true });

  const committeeIds = (committeesRows ?? []).map((c) => c.id);
  const membersMap = new Map<string, CommitteeMemberSnapshot[]>();

  if (committeeIds.length > 0) {
    const { data: memberRows } = await supabase
      .from("committee_members")
      .select(
        "id, committee_id, person_id, role_label, group_name, nationality_group, sort_order, status, people ( id, full_name, institution )"
      )
      .in("committee_id", committeeIds)
      .order("sort_order", { ascending: true });

    for (const m of memberRows ?? []) {
      const person = Array.isArray(m.people) ? m.people[0] : m.people;
      const list = membersMap.get(m.committee_id) ?? [];
      list.push({
        id: m.id,
        personId: m.person_id,
        fullName: person?.full_name ?? "Member",
        affiliation: person?.institution ?? "",
        roleLabel: m.role_label,
        groupName: m.group_name,
        nationalityGroup:
          m.nationality_group === "international" ? "international" : "national",
        sortOrder: m.sort_order,
        status: m.status as PublicationStatus,
      });
      membersMap.set(m.committee_id, list);
    }
  }

  const committees: CommitteeSnapshot[] = (committeesRows ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    category: c.category as CommitteeCategory,
    description: c.description,
    sortOrder: c.sort_order,
    status: c.status as PublicationStatus,
    members: membersMap.get(c.id) ?? [],
  }));

  return { context, committees };
}

export async function loadAdminProgrammeData(requestedYear?: number): Promise<{
  context: AdminModuleContext;
  tracks: TrackSnapshot[];
  sessions: ProgramSessionSnapshot[];
  speakers: SpeakerSnapshot[];
}> {
  const { context, supabase } = await resolveEditionHeader(requestedYear);
  const fallback = getFallbackEditionSnapshot(
    context.editionYear === 2026 ? 2026 : 2027
  );

  if (!supabase || context.source === "fallback") {
    return {
      context,
      tracks: fallback.tracks,
      sessions: fallback.programSessions,
      speakers: fallback.speakers,
    };
  }

  const [{ data: trackRows }, { data: sessionRows }, speakersRes] =
    await Promise.all([
      supabase
        .from("tracks")
        .select("*")
        .eq("edition_id", context.editionId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("program_sessions")
        .select("*")
        .eq("edition_id", context.editionId)
        .order("starts_at", { ascending: true }),
      loadAdminSpeakersData(context.editionYear),
    ]);

  const tracks: TrackSnapshot[] = (trackRows ?? []).map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description ?? "",
    topics: asStringArray(t.topics),
    imageUrl: t.image_url,
    sortOrder: t.sort_order,
    status: t.status as PublicationStatus,
  }));

  const sessions: ProgramSessionSnapshot[] = (sessionRows ?? []).map((s) => ({
    id: s.id,
    trackId: s.track_id,
    speakerId: s.speaker_id,
    sessionDate: s.session_date,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    title: s.title,
    description: s.description,
    roomOrLink: s.room_or_link,
    sortOrder: s.sort_order,
    status: s.status as PublicationStatus,
  }));

  return {
    context,
    tracks,
    sessions,
    speakers: speakersRes.speakers,
  };
}

export async function loadAdminSponsorsData(requestedYear?: number): Promise<{
  context: AdminModuleContext;
  sponsors: SponsorSnapshot[];
}> {
  const { context, supabase } = await resolveEditionHeader(requestedYear);
  const fallback = getFallbackEditionSnapshot(
    context.editionYear === 2026 ? 2026 : 2027
  );

  if (!supabase || context.source === "fallback") {
    return { context, sponsors: fallback.sponsors };
  }

  const { data: rows } = await supabase
    .from("sponsors")
    .select("*")
    .eq("edition_id", context.editionId)
    .order("sort_order", { ascending: true });

  const sponsors: SponsorSnapshot[] = (rows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    tier: s.tier,
    logoUrl: s.logo_url,
    websiteUrl: s.website_url,
    description: s.description,
    sortOrder: s.sort_order,
    status: s.status as PublicationStatus,
  }));

  return { context, sponsors };
}

export async function loadAdminRegistrationData(requestedYear?: number): Promise<{
  context: AdminModuleContext;
  fees: RegistrationFeeSnapshot[];
  paymentInstructions: PaymentInstructions;
}> {
  const { context, supabase } = await resolveEditionHeader(requestedYear);
  const fallback = getFallbackEditionSnapshot(
    context.editionYear === 2026 ? 2026 : 2027
  );

  if (!supabase || context.source === "fallback") {
    return {
      context,
      fees: fallback.registrationFees,
      paymentInstructions: fallback.paymentInstructions,
    };
  }

  const { data: rows } = await supabase
    .from("registration_fees")
    .select("*")
    .eq("edition_id", context.editionId)
    .order("sort_order", { ascending: true });

  const fees: RegistrationFeeSnapshot[] = (rows ?? []).map((f) => ({
    id: f.id,
    category: f.category,
    amountInr: f.amount_inr,
    amountUsd: f.amount_usd,
    indianDisplay: f.indian_display ?? `₹${f.amount_inr}`,
    foreignDisplay: f.foreign_display ?? `$${f.amount_usd}`,
    taxNote: f.tax_note ?? "",
    sortOrder: f.sort_order,
    status: f.status as PublicationStatus,
  }));

  const primaryInstructionsRow = (rows ?? []).find(
    (r) =>
      r.payment_instructions &&
      typeof r.payment_instructions === "object" &&
      !Array.isArray(r.payment_instructions) &&
      Object.keys(r.payment_instructions as Record<string, unknown>).length > 0
  );

  const paymentInstructions = parsePaymentInstructions(
    primaryInstructionsRow?.payment_instructions,
    fallback.paymentInstructions
  );

  return { context, fees, paymentInstructions };
}

export async function loadAdminUsersData(): Promise<{
  source: "database" | "fallback";
  users: AdminUserRecord[];
}> {
  if (!isSupabaseConfigured()) {
    return { source: "fallback", users: [] };
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("admin_roles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data) {
      return { source: "fallback", users: [] };
    }

    return {
      source: "database",
      users: data.map((u) => ({
        userId: u.user_id,
        email: u.email,
        displayName: u.display_name,
        role: u.role,
        canApproveFinancial: u.can_approve_financial,
        isActive: u.is_active,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      })),
    };
  } catch {
    return { source: "fallback", users: [] };
  }
}

export async function loadAdminAuditActivity(
  rawPage?: string | string[],
  pageSize = 25
): Promise<AuditLogPage> {
  const parsedPage = Number(Array.isArray(rawPage) ? rawPage[0] : rawPage);
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  if (!isSupabaseConfigured()) {
    return {
      source: "fallback",
      page,
      pageSize,
      totalCount: 0,
      logs: [],
    };
  }

  try {
    const supabase = await createServerSupabase();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error || !data) {
      return {
        source: "fallback",
        page,
        pageSize,
        totalCount: 0,
        logs: [],
      };
    }

    return {
      source: "database",
      page,
      pageSize,
      totalCount: count ?? data.length,
      logs: data,
    };
  } catch {
    return {
      source: "fallback",
      page,
      pageSize,
      totalCount: 0,
      logs: [],
    };
  }
}
