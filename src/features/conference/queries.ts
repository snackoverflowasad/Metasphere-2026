import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import type {
  CommitteeCategory,
  CommitteeMemberSnapshot,
  CommitteeSnapshot,
  ConferenceLinkSnapshot,
  Database,
  DeadlineSnapshot,
  EditionSnapshot,
  PaymentInstructions,
  ProgramSessionSnapshot,
  PublicationStatus,
  RegistrationFeeSnapshot,
  ResourceSnapshot,
  SpeakerSnapshot,
  SponsorSnapshot,
  TrackSnapshot,
} from "@/types/database";
import { getAdminContext } from "@/lib/auth/session";
import { editionCacheTag } from "@/lib/cache/tags";
import { getFallbackEditionSnapshot } from "@/lib/fallback/seed-snapshot";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

function createAnonSupabaseClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const filtered = value.filter((item): item is string => typeof item === "string");
  return filtered.length > 0 ? filtered : fallback;
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
    policies: asStringArray(obj.policies, fallback.policies),
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

async function fetchEditionFromClient(
  supabase: ReturnType<typeof createAnonSupabaseClient>,
  year: number,
  includeDrafts: boolean
): Promise<EditionSnapshot | null> {
  const fallback = getFallbackEditionSnapshot(year === 2026 ? 2026 : 2027);
  const allowedStatuses: PublicationStatus[] = includeDrafts
    ? ["draft", "published", "archived"]
    : ["published", "archived"];

  const { data: editionRow, error: editionErr } = await supabase
    .from("conference_editions")
    .select("*")
    .eq("year", year)
    .in("status", allowedStatuses)
    .maybeSingle();

  if (editionErr || !editionRow) {
    return null;
  }

  const [
    settingsRes,
    deadlinesRes,
    tracksRes,
    speakersRes,
    committeesRes,
    sponsorsRes,
    sessionsRes,
    resourcesRes,
    linksRes,
    feesRes,
  ] = await Promise.all([
    supabase
      .from("site_settings")
      .select("*")
      .eq("edition_id", editionRow.id)
      .in("status", allowedStatuses)
      .maybeSingle(),
    supabase
      .from("deadlines")
      .select("*")
      .eq("edition_id", editionRow.id)
      .in("status", allowedStatuses)
      .order("sort_order", { ascending: true }),
    supabase
      .from("tracks")
      .select("*")
      .eq("edition_id", editionRow.id)
      .in("status", allowedStatuses)
      .order("sort_order", { ascending: true }),
    supabase
      .from("speakers")
      .select(
        "id, person_id, speaker_type, talk_title, talk_abstract, image_alt, sort_order, status, people ( id, full_name, designation, institution, country, photo_url )"
      )
      .eq("edition_id", editionRow.id)
      .in("status", allowedStatuses)
      .order("sort_order", { ascending: true }),
    supabase
      .from("committees")
      .select("*")
      .eq("edition_id", editionRow.id)
      .in("status", allowedStatuses)
      .order("sort_order", { ascending: true }),
    supabase
      .from("sponsors")
      .select("*")
      .eq("edition_id", editionRow.id)
      .in("status", allowedStatuses)
      .order("sort_order", { ascending: true }),
    supabase
      .from("program_sessions")
      .select("*")
      .eq("edition_id", editionRow.id)
      .in("status", allowedStatuses)
      .order("starts_at", { ascending: true }),
    supabase
      .from("resources")
      .select("*")
      .eq("edition_id", editionRow.id)
      .in("status", allowedStatuses)
      .order("sort_order", { ascending: true }),
    supabase
      .from("conference_links")
      .select("*")
      .eq("edition_id", editionRow.id)
      .in("status", allowedStatuses)
      .order("key", { ascending: true }),
    supabase
      .from("registration_fees")
      .select("*")
      .eq("edition_id", editionRow.id)
      .in("status", allowedStatuses)
      .order("sort_order", { ascending: true }),
  ]);

  const committeeIds = (committeesRes.data ?? []).map((c) => c.id);
  const membersByCommittee = new Map<string, CommitteeMemberSnapshot[]>();

  if (committeeIds.length > 0) {
    const { data: memberRows } = await supabase
      .from("committee_members")
      .select(
        "id, committee_id, person_id, role_label, group_name, nationality_group, sort_order, status, people ( id, full_name, institution )"
      )
      .in("committee_id", committeeIds)
      .in("status", allowedStatuses)
      .order("sort_order", { ascending: true });

    for (const m of memberRows ?? []) {
      const person = Array.isArray(m.people) ? m.people[0] : m.people;
      const list = membersByCommittee.get(m.committee_id) ?? [];
      list.push({
        id: m.id,
        personId: m.person_id,
        fullName: person?.full_name ?? "Committee Member",
        affiliation:
          typeof person?.institution === "string" ? person.institution : "",
        roleLabel: m.role_label,
        groupName: m.group_name,
        nationalityGroup:
          m.nationality_group === "international" ? "international" : "national",
        sortOrder: m.sort_order,
        status: m.status as PublicationStatus,
      });
      membersByCommittee.set(m.committee_id, list);
    }
  }

  const conferenceLinks: ConferenceLinkSnapshot[] = (linksRes.data ?? []).map(
    (l) => ({
      id: l.id,
      key: l.key,
      label: l.label,
      url: l.url,
      status: l.status as PublicationStatus,
    })
  );

  const linksByKey: Record<string, string> = { ...fallback.linksByKey };
  for (const link of conferenceLinks) {
    linksByKey[link.key] = link.url;
  }

  const deadlines: DeadlineSnapshot[] = (deadlinesRes.data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    dueAt: d.due_at,
    displayDate: d.display_date ?? "",
    originalDate: d.original_date,
    isExtended: d.is_extended,
    isConferenceDate: d.is_conference_date,
    sortOrder: d.sort_order,
    isVisible: d.is_visible,
    status: d.status as PublicationStatus,
  }));

  const tracks: TrackSnapshot[] = (tracksRes.data ?? []).map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description ?? "",
    topics: asStringArray(t.topics, []),
    imageUrl: t.image_url,
    sortOrder: t.sort_order,
    status: t.status as PublicationStatus,
  }));

  const speakers: SpeakerSnapshot[] = (speakersRes.data ?? []).map((s) => {
    const person = Array.isArray(s.people) ? s.people[0] : s.people;
    const institution =
      typeof person?.institution === "string" ? person.institution : "";
    return {
      id: s.id,
      personId: s.person_id,
      fullName: person?.full_name ?? "Speaker",
      designation:
        typeof person?.designation === "string" ? person.designation : "",
      institution,
      affiliations: institution
        .split(",")
        .map((part: string) => part.trim())
        .filter(Boolean),
      country: typeof person?.country === "string" ? person.country : null,
      photoUrl: typeof person?.photo_url === "string" ? person.photo_url : "",
      imageAlt: s.image_alt ?? person?.full_name ?? "Speaker photo",
      speakerType: s.speaker_type,
      talkTitle: s.talk_title,
      talkAbstract: s.talk_abstract,
      sortOrder: s.sort_order,
      status: s.status as PublicationStatus,
    };
  });

  const committees: CommitteeSnapshot[] = (committeesRes.data ?? []).map(
    (c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      category: c.category as CommitteeCategory,
      description: c.description,
      sortOrder: c.sort_order,
      status: c.status as PublicationStatus,
      members: membersByCommittee.get(c.id) ?? [],
    })
  );

  const sponsors: SponsorSnapshot[] = (sponsorsRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    tier: s.tier,
    logoUrl: s.logo_url,
    websiteUrl: s.website_url,
    description: s.description,
    sortOrder: s.sort_order,
    status: s.status as PublicationStatus,
  }));

  const programSessions: ProgramSessionSnapshot[] = (sessionsRes.data ?? []).map(
    (s) => ({
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
    })
  );

  const resources: ResourceSnapshot[] = (resourcesRes.data ?? []).map((r) => ({
    id: r.id,
    label: r.label,
    category: r.category,
    url: r.url,
    storagePath: r.storage_path,
    sortOrder: r.sort_order,
    status: r.status as PublicationStatus,
  }));

  const registrationFees: RegistrationFeeSnapshot[] = (feesRes.data ?? []).map(
    (f) => ({
      id: f.id,
      category: f.category,
      amountInr: f.amount_inr,
      amountUsd: f.amount_usd,
      indianDisplay: f.indian_display ?? `${f.amount_inr} INR/-`,
      foreignDisplay: f.foreign_display ?? `${f.amount_usd} USD`,
      taxNote: f.tax_note ?? "",
      sortOrder: f.sort_order,
      status: f.status as PublicationStatus,
    })
  );

  const primaryInstructionsRow = (feesRes.data ?? []).find(
    (r) =>
      r.payment_instructions &&
      typeof r.payment_instructions === "object" &&
      !Array.isArray(r.payment_instructions) &&
      Object.keys(r.payment_instructions as Record<string, unknown>).length > 0
  );

  const settingsRow = settingsRes.data;

  return {
    edition: {
      id: editionRow.id,
      year: editionRow.year,
      slug: editionRow.slug,
      title: editionRow.title,
      subtitle: editionRow.subtitle ?? fallback.edition.subtitle,
      tagline: editionRow.tagline ?? fallback.edition.tagline,
      loaderSubtitle:
        editionRow.loader_subtitle ?? fallback.edition.loaderSubtitle,
      datesDisplay: editionRow.dates_display ?? fallback.edition.datesDisplay,
      startDate: editionRow.start_date,
      endDate: editionRow.end_date,
      timezone: editionRow.timezone,
      venueName: editionRow.venue_name,
      venueAddress: editionRow.venue_address ?? fallback.edition.venueAddress,
      venueCity: editionRow.venue_city ?? fallback.edition.venueCity,
      format: editionRow.format,
      description: editionRow.description ?? fallback.edition.description,
      organizers: asStringArray(editionRow.organizers, fallback.edition.organizers),
      collaborators: asStringArray(
        editionRow.collaborators,
        fallback.edition.collaborators
      ),
      technicalCoSponsorsSummary:
        editionRow.technical_co_sponsors_summary ??
        fallback.edition.technicalCoSponsorsSummary,
      cmtAcknowledgment:
        editionRow.cmt_acknowledgment ?? fallback.edition.cmtAcknowledgment,
      publicationNote:
        editionRow.publication_note ?? fallback.edition.publicationNote,
      publicationBookCoverAsset:
        editionRow.publication_book_cover_asset ??
        fallback.edition.publicationBookCoverAsset,
      programScheduleQrAsset:
        editionRow.program_schedule_qr_asset ??
        fallback.edition.programScheduleQrAsset,
      contactEmails: asStringArray(
        editionRow.contact_emails,
        fallback.edition.contactEmails
      ),
      contactPhones: asStringArray(
        editionRow.contact_phones,
        fallback.edition.contactPhones
      ),
      isActive: editionRow.is_active,
      status: editionRow.status as PublicationStatus,
    },
    siteSettings: {
      id: settingsRow?.id ?? fallback.siteSettings.id,
      editionId: editionRow.id,
      canonicalUrl:
        settingsRow?.canonical_url ?? fallback.siteSettings.canonicalUrl,
      seoTitle: settingsRow?.seo_title ?? fallback.siteSettings.seoTitle,
      seoDescription:
        settingsRow?.seo_description ?? fallback.siteSettings.seoDescription,
      themeTokens: fallback.siteSettings.themeTokens,
      heroMedia: fallback.siteSettings.heroMedia,
      status: (settingsRow?.status as PublicationStatus) ?? "published",
    },
    deadlines: deadlines.length > 0 ? deadlines : fallback.deadlines,
    tracks: tracks.length > 0 ? tracks : fallback.tracks,
    speakers: speakers.length > 0 ? speakers : fallback.speakers,
    committees: committees.length > 0 ? committees : fallback.committees,
    sponsors: sponsors.length > 0 ? sponsors : fallback.sponsors,
    programSessions,
    resources: resources.length > 0 ? resources : fallback.resources,
    conferenceLinks:
      conferenceLinks.length > 0 ? conferenceLinks : fallback.conferenceLinks,
    linksByKey,
    registrationFees:
      registrationFees.length > 0 ? registrationFees : fallback.registrationFees,
    paymentInstructions: parsePaymentInstructions(
      primaryInstructionsRow?.payment_instructions,
      fallback.paymentInstructions
    ),
  };
}

/**
 * Returns the currently active conference edition year (defaults to 2027
 * when Supabase is unconfigured or no active edition row exists yet).
 */
export async function getActiveEditionYear(): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 2027;
  }

  try {
    const supabase = createAnonSupabaseClient();
    const { data } = await supabase
      .from("conference_editions")
      .select("year")
      .eq("is_active", true)
      .eq("status", "published")
      .maybeSingle<{ year: number }>();

    return data?.year ?? 2027;
  } catch {
    return 2027;
  }
}

/**
 * Resolves `true` only when Next.js Draft Mode is active AND the caller holds
 * a verified `aal2` admin session.
 */
export async function isAuthorizedDraftPreview(): Promise<boolean> {
  try {
    const draft = await draftMode();
    if (!draft.isEnabled) {
      return false;
    }
    const admin = await getAdminContext();
    return Boolean(admin);
  } catch {
    return false;
  }
}

/**
 * Loads a complete edition snapshot for public or preview routes. Uses
 * `unstable_cache` with tag `edition:<year>` for public views and falls back
 * seamlessly to local typed seed snapshots when Supabase is not connected yet.
 */
export async function getEditionSnapshot(
  requestedYear?: number,
  options?: { includeDrafts?: boolean }
): Promise<EditionSnapshot> {
  const year = requestedYear ?? (await getActiveEditionYear());
  const fallbackYear = year === 2026 ? 2026 : 2027;
  const fallback = getFallbackEditionSnapshot(fallbackYear);
  const includeDrafts = Boolean(options?.includeDrafts);

  if (includeDrafts) {
    if (!isSupabaseConfigured()) {
      return fallback;
    }
    try {
      const serverClient = await createServerSupabase();
      const snapshot = await fetchEditionFromClient(serverClient, year, true);
      return snapshot ?? fallback;
    } catch {
      return fallback;
    }
  }

  const fetchUncached = async (): Promise<EditionSnapshot> => {
    if (!isSupabaseConfigured()) {
      return fallback;
    }
    try {
      const anonClient = createAnonSupabaseClient();
      const snapshot = await fetchEditionFromClient(anonClient, year, false);
      return snapshot ?? fallback;
    } catch {
      return fallback;
    }
  };

  const loadCached = unstable_cache(
    fetchUncached,
    ["edition-snapshot", String(year)],
    {
      tags: [editionCacheTag(year)],
      revalidate: 3600,
    }
  );

  try {
    return await loadCached();
  } catch (err) {
    // Outside Next.js request/cache runtime (e.g., standalone integration tests),
    // `unstable_cache` throws "Invariant: incrementalCache missing".
    if (err instanceof Error && err.message.includes("incrementalCache missing")) {
      return fetchUncached();
    }
    throw err;
  }
}

/**
 * Generates dynamic Schema.org `Event` JSON-LD metadata from the active or
 * archived edition snapshot cleanly.
 */
export function buildEventJsonLd(
  snapshot: EditionSnapshot
): Record<string, unknown> {
  const { edition, siteSettings, registrationFees } = snapshot;
  const primaryAuthorFees = registrationFees
    .filter(
      (f) =>
        !/extra\s*page|accompanying/i.test(f.category) &&
        Number.isFinite(f.amountInr) &&
        f.amountInr > 0
    )
    .map((f) => f.amountInr);
  const allPositiveFees = registrationFees
    .map((f) => f.amountInr)
    .filter((amt) => Number.isFinite(amt) && amt > 0);
  const candidateFees =
    primaryAuthorFees.length > 0 ? primaryAuthorFees : allPositiveFees;
  const lowestInr =
    candidateFees.length > 0 ? String(Math.min(...candidateFees)) : "4000";

  const canonicalBase = siteSettings.canonicalUrl.replace(/\/+$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: edition.title,
    startDate: edition.startDate,
    endDate: edition.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode:
      edition.format === "online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : edition.format === "offline"
          ? "https://schema.org/OfflineEventAttendanceMode"
          : "https://schema.org/MixedEventAttendanceMode",
    location: [
      {
        "@type": "Place",
        name: edition.venueName,
        address: {
          "@type": "PostalAddress",
          streetAddress: edition.venueAddress || "GN-34/2, Sector V, Bidhannagar",
          addressLocality: edition.venueCity || "Kolkata",
          addressRegion: "West Bengal",
          postalCode: "700091",
          addressCountry: "IN",
        },
      },
      {
        "@type": "VirtualLocation",
        url: canonicalBase,
      },
    ],
    image: [`${canonicalBase}/Assets/Logo.png`],
    description: edition.description,
    organizer: {
      "@type": "Organization",
      name: "Institute of Engineering & Management (IEM), Kolkata",
      url: "https://iem.edu.in",
    },
    offers: {
      "@type": "Offer",
      url: `${canonicalBase}/registration`,
      price: lowestInr,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };
}

/**
 * Serializes JSON-LD safely for HTML `<script type="application/ld+json">` injection
 * by escaping `<`, `>`, `&`, and Unicode line separators so `</script>` breakout is impossible.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
