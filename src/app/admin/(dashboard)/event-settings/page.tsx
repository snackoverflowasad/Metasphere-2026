import type { Metadata } from "next";
import { requireAdminPageSession } from "@/lib/auth/session";
import {
  loadAdminEditionData,
  resolveEditionYearParam,
} from "@/lib/cms/admin-data";
import { EventSettingsForm } from "./EventSettingsForm";

export const metadata: Metadata = {
  title: "Event Settings & SEO",
};

interface EventSettingsPageProps {
  searchParams: Promise<{ edition?: string | string[] }>;
}

export default async function AdminEventSettingsPage({
  searchParams,
}: EventSettingsPageProps) {
  const params = await searchParams;
  const year = resolveEditionYearParam(params.edition);

  const [actor, data] = await Promise.all([
    requireAdminPageSession(),
    loadAdminEditionData(year),
  ]);

  return (
    <EventSettingsForm
      key={`${data.edition.id}-${data.selectedYear}`}
      edition={data.edition}
      siteSettings={data.siteSettings}
      actorRole={actor.role}
      isFallbackRecord={data.source === "fallback"}
    />
  );
}
