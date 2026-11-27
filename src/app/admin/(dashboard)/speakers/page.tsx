import type { Metadata } from "next";
import { requireAdminPageSession } from "@/lib/auth/session";
import { resolveEditionYearParam } from "@/lib/cms/admin-data";
import { loadAdminSpeakersData } from "@/lib/cms/admin-modules";
import { SpeakersManager } from "./SpeakersManager";

export const metadata: Metadata = {
  title: "Speakers",
};

interface SpeakersPageProps {
  searchParams: Promise<{ edition?: string | string[] }>;
}

export default async function AdminSpeakersPage({ searchParams }: SpeakersPageProps) {
  const params = await searchParams;
  const year = resolveEditionYearParam(params.edition);

  const [actor, data] = await Promise.all([
    requireAdminPageSession(),
    loadAdminSpeakersData(year),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {data.context.editionSubtitle} — Speakers
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage keynote and invited speakers, affiliations, talk metadata, and photos.
        </p>
      </div>

      <SpeakersManager
        editionId={data.context.editionId}
        editionYear={data.context.editionYear}
        speakers={data.speakers}
        actorRole={actor.role}
        isFallbackRecord={data.context.source === "fallback"}
      />
    </div>
  );
}
