import type { Metadata } from "next";
import { requireAdminPageSession } from "@/lib/auth/session";
import { resolveEditionYearParam } from "@/lib/cms/admin-data";
import { loadAdminProgrammeData } from "@/lib/cms/admin-modules";
import { TracksManager } from "./TracksManager";

export const metadata: Metadata = {
  title: "Tracks",
};

interface TracksPageProps {
  searchParams: Promise<{ edition?: string | string[] }>;
}

export default async function AdminTracksPage({ searchParams }: TracksPageProps) {
  const params = await searchParams;
  const year = resolveEditionYearParam(params.edition);

  const [actor, data] = await Promise.all([
    requireAdminPageSession(),
    loadAdminProgrammeData(year),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {data.context.editionSubtitle} — Call for Papers Tracks
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage conference research tracks, topic lists, and track visuals.
        </p>
      </div>

      <TracksManager
        editionId={data.context.editionId}
        editionYear={data.context.editionYear}
        tracks={data.tracks}
        actorRole={actor.role}
        isFallbackRecord={data.context.source === "fallback"}
      />
    </div>
  );
}
