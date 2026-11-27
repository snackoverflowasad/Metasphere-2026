import type { Metadata } from "next";
import { requireAdminPageSession } from "@/lib/auth/session";
import { resolveEditionYearParam } from "@/lib/cms/admin-data";
import { loadAdminProgrammeData } from "@/lib/cms/admin-modules";
import { ProgrammeManager } from "./ProgrammeManager";

export const metadata: Metadata = {
  title: "Technical Programme",
};

interface ProgrammePageProps {
  searchParams: Promise<{ edition?: string | string[] }>;
}

export default async function AdminProgrammePage({
  searchParams,
}: ProgrammePageProps) {
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
          {data.context.editionSubtitle} — Technical Programme
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Schedule keynotes, paper sessions, and rooms in IST (Asia/Kolkata).
        </p>
      </div>

      <ProgrammeManager
        editionId={data.context.editionId}
        editionYear={data.context.editionYear}
        sessions={data.sessions}
        tracks={data.tracks}
        speakers={data.speakers}
        actorRole={actor.role}
        isFallbackRecord={data.context.source === "fallback"}
      />
    </div>
  );
}
