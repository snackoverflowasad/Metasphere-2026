import "server-only";
import type {
  ConferenceLinkSnapshot,
  Database,
  DeadlineSnapshot,
  EditionSummary,
  PublicationStatus,
  ResourceSnapshot,
  SiteSettingsSnapshot,
} from "@/types/database";
import { getFallbackEditionSnapshot } from "@/lib/fallback/seed-snapshot";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export interface AdminEditionSummaryCounts {
  deadlines: number;
  publishedDeadlines: number;
  conferenceLinks: number;
  resources: number;
  tracks: number;
  speakers: number;
  committees: number;
  sponsors: number;
  programSessions: number;
  registrationFees: number;
}

export interface AdminEditionData {
  source: "database" | "fallback";
  selectedYear: number;
  availableEditions: Array<{
    id: string;
    year: number;
    subtitle: string;
    status: PublicationStatus;
    isActive: boolean;
  }>;
  edition: EditionSummary;
  siteSettings: SiteSettingsSnapshot;
  deadlines: DeadlineSnapshot[];
  conferenceLinks: ConferenceLinkSnapshot[];
  resources: ResourceSnapshot[];
  counts: AdminEditionSummaryCounts;
  recentAuditLogs: Database["public"]["Tables"]["audit_logs"]["Row"][];
}

function parseStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function resolveEditionYearParam(raw?: string | string[] | null): number {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(candidate);
  if (Number.isInteger(parsed) && parsed >= 2020 && parsed <= 2100) {
    return parsed;
  }
  return 2027;
}

/**
 * Loads edition data, deadlines, links, resources, counts, and recent audit logs
 * for the Admin CMS from Supabase (including drafts), falling back gracefully to
 * the local seed snapshot if an edition is not seeded yet or Supabase is unconfigured.
 */
export async function loadAdminEditionData(
  requestedYear?: number
): Promise<AdminEditionData> {
  const year = requestedYear ?? 2027;
  const fallbackYear = year === 2026 ? 2026 : 2027;
  const fallback = getFallbackEditionSnapshot(fallbackYear);

  const defaultResult: AdminEditionData = {
    source: "fallback",
    selectedYear: fallback.edition.year,
    availableEditions: [
      {
        id: "fallback-edition-2027",
        year: 2027,
        subtitle: "MetaSphere 2027",
        status: "published",
        isActive: true,
      },
      {
        id: "fallback-edition-2026",
        year: 2026,
        subtitle: "MetaSphere 2026",
        status: "archived",
        isActive: false,
      },
    ],
    edition: fallback.edition,
    siteSettings: fallback.siteSettings,
    deadlines: fallback.deadlines,
    conferenceLinks: fallback.conferenceLinks,
    resources: fallback.resources,
    counts: {
      deadlines: fallback.deadlines.length,
      publishedDeadlines: fallback.deadlines.filter(
        (d) => d.status === "published"
      ).length,
      conferenceLinks: fallback.conferenceLinks.length,
      resources: fallback.resources.length,
      tracks: fallback.tracks.length,
      speakers: fallback.speakers.length,
      committees: fallback.committees.length,
      sponsors: fallback.sponsors.length,
      programSessions: fallback.programSessions.length,
      registrationFees: fallback.registrationFees.length,
    },
    recentAuditLogs: [],
  };

  if (!isSupabaseConfigured()) {
    return defaultResult;
  }

  try {
    const supabase = await createServerSupabase();

    const { data: editionsList } = await supabase
      .from("conference_editions")
      .select("id, year, subtitle, title, status, is_active")
      .order("year", { ascending: false });

    const { data: editionRow } = await supabase
      .from("conference_editions")
      .select("*")
      .eq("year", year)
      .maybeSingle();

    if (!editionRow) {
      return defaultResult;
    }

    const [
      settingsRes,
      deadlinesRes,
      linksRes,
      resourcesRes,
      tracksCount,
      speakersCount,
      committeesCount,
      sponsorsCount,
      sessionsCount,
      feesCount,
      auditLogsRes,
    ] = await Promise.all([
      supabase
        .from("site_settings")
        .select("*")
        .eq("edition_id", editionRow.id)
        .maybeSingle(),
      supabase
        .from("deadlines")
        .select("*")
        .eq("edition_id", editionRow.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("conference_links")
        .select("*")
        .eq("edition_id", editionRow.id)
        .order("key", { ascending: true }),
      supabase
        .from("resources")
        .select("*")
        .eq("edition_id", editionRow.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("tracks")
        .select("id", { count: "exact", head: true })
        .eq("edition_id", editionRow.id),
      supabase
        .from("speakers")
        .select("id", { count: "exact", head: true })
        .eq("edition_id", editionRow.id),
      supabase
        .from("committees")
        .select("id", { count: "exact", head: true })
        .eq("edition_id", editionRow.id),
      supabase
        .from("sponsors")
        .select("id", { count: "exact", head: true })
        .eq("edition_id", editionRow.id),
      supabase
        .from("program_sessions")
        .select("id", { count: "exact", head: true })
        .eq("edition_id", editionRow.id),
      supabase
        .from("registration_fees")
        .select("id", { count: "exact", head: true })
        .eq("edition_id", editionRow.id),
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const mappedEdition: EditionSummary = {
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
      venueAddress: editionRow.venue_address ?? "",
      venueCity: editionRow.venue_city ?? "",
      format: editionRow.format,
      description: editionRow.description ?? "",
      organizers: parseStringArray(
        editionRow.organizers,
        fallback.edition.organizers
      ),
      collaborators: parseStringArray(
        editionRow.collaborators,
        fallback.edition.collaborators
      ),
      technicalCoSponsorsSummary:
        editionRow.technical_co_sponsors_summary ?? "",
      cmtAcknowledgment: editionRow.cmt_acknowledgment ?? "",
      publicationNote: editionRow.publication_note ?? "",
      publicationBookCoverAsset:
        editionRow.publication_book_cover_asset ??
        fallback.edition.publicationBookCoverAsset,
      programScheduleQrAsset:
        editionRow.program_schedule_qr_asset ??
        fallback.edition.programScheduleQrAsset,
      contactEmails: parseStringArray(
        editionRow.contact_emails,
        fallback.edition.contactEmails
      ),
      contactPhones: parseStringArray(
        editionRow.contact_phones,
        fallback.edition.contactPhones
      ),
      isActive: editionRow.is_active,
      status: editionRow.status,
    };

    const settingsRow = settingsRes.data;
    const mappedSettings: SiteSettingsSnapshot = settingsRow
      ? {
          id: settingsRow.id,
          editionId: settingsRow.edition_id,
          canonicalUrl: settingsRow.canonical_url,
          seoTitle: settingsRow.seo_title,
          seoDescription: settingsRow.seo_description,
          themeTokens: fallback.siteSettings.themeTokens,
          heroMedia: fallback.siteSettings.heroMedia,
          status: settingsRow.status,
        }
      : {
          ...fallback.siteSettings,
          editionId: editionRow.id,
        };

    const mappedDeadlines: DeadlineSnapshot[] = (deadlinesRes.data ?? []).map(
      (d) => ({
        id: d.id,
        title: d.title,
        dueAt: d.due_at,
        displayDate: d.display_date ?? "",
        originalDate: d.original_date,
        isExtended: d.is_extended,
        isConferenceDate: d.is_conference_date,
        sortOrder: d.sort_order,
        isVisible: d.is_visible,
        status: d.status,
      })
    );

    const mappedLinks: ConferenceLinkSnapshot[] = (linksRes.data ?? []).map(
      (link) => ({
        id: link.id,
        key: link.key,
        label: link.label,
        url: link.url,
        status: link.status,
      })
    );

    const mappedResources: ResourceSnapshot[] = (resourcesRes.data ?? []).map(
      (r) => ({
        id: r.id,
        label: r.label,
        category: r.category,
        url: r.url,
        storagePath: r.storage_path,
        sortOrder: r.sort_order,
        status: r.status,
      })
    );

    return {
      source: "database",
      selectedYear: editionRow.year,
      availableEditions:
        editionsList && editionsList.length > 0
          ? editionsList.map((e) => ({
              id: e.id,
              year: e.year,
              subtitle: e.subtitle ?? `MetaSphere ${e.year}`,
              status: e.status,
              isActive: e.is_active,
            }))
          : defaultResult.availableEditions,
      edition: mappedEdition,
      siteSettings: mappedSettings,
      deadlines: mappedDeadlines,
      conferenceLinks: mappedLinks,
      resources: mappedResources,
      counts: {
        deadlines: mappedDeadlines.length,
        publishedDeadlines: mappedDeadlines.filter(
          (d) => d.status === "published"
        ).length,
        conferenceLinks: mappedLinks.length,
        resources: mappedResources.length,
        tracks: tracksCount.count ?? 0,
        speakers: speakersCount.count ?? 0,
        committees: committeesCount.count ?? 0,
        sponsors: sponsorsCount.count ?? 0,
        programSessions: sessionsCount.count ?? 0,
        registrationFees: feesCount.count ?? 0,
      },
      recentAuditLogs: auditLogsRes.data ?? [],
    };
  } catch {
    return defaultResult;
  }
}
