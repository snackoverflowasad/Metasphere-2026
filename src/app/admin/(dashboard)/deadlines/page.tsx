import type { Metadata } from "next";
import { requireAdminPageSession } from "@/lib/auth/session";
import {
  loadAdminEditionData,
  resolveEditionYearParam,
} from "@/lib/cms/admin-data";
import { DeadlinesManager } from "./DeadlinesManager";

export const metadata: Metadata = {
  title: "Important Dates & Deadlines",
};

interface DeadlinesPageProps {
  searchParams: Promise<{ edition?: string | string[] }>;
}

export default async function AdminDeadlinesPage({
  searchParams,
}: DeadlinesPageProps) {
  const params = await searchParams;
  const year = resolveEditionYearParam(params.edition);

  const [actor, data] = await Promise.all([
    requireAdminPageSession(),
    loadAdminEditionData(year),
  ]);

  return (
    <DeadlinesManager
      key={`${data.edition.id}-${data.selectedYear}`}
      editionId={data.edition.id}
      editionYear={data.selectedYear}
      deadlines={data.deadlines}
      actorRole={actor.role}
      isFallbackRecord={data.source === "fallback"}
    />
  );
}
