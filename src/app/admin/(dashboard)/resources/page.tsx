import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/auth/session";
import {
  loadAdminEditionData,
  resolveEditionYearParam,
} from "@/lib/cms/admin-data";
import { ResourcesManager } from "./ResourcesManager";

export const metadata: Metadata = {
  title: "Links & Resources",
};

interface ResourcesPageProps {
  searchParams: Promise<{ edition?: string | string[] }>;
}

export default async function AdminResourcesPage({
  searchParams,
}: ResourcesPageProps) {
  const params = await searchParams;
  const year = resolveEditionYearParam(params.edition);

  const [actor, data] = await Promise.all([
    requireAdminSession(),
    loadAdminEditionData(year),
  ]);

  return (
    <ResourcesManager
      key={`${data.edition.id}-${data.selectedYear}`}
      editionId={data.edition.id}
      editionYear={data.selectedYear}
      conferenceLinks={data.conferenceLinks}
      resources={data.resources}
      actorRole={actor.role}
      isFallbackRecord={data.source === "fallback"}
    />
  );
}
