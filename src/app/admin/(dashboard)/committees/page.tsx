import type { Metadata } from "next";
import { requireAdminPageSession } from "@/lib/auth/session";
import { resolveEditionYearParam } from "@/lib/cms/admin-data";
import { loadAdminCommitteesData } from "@/lib/cms/admin-modules";
import { CommitteesManager } from "./CommitteesManager";

export const metadata: Metadata = {
  title: "Committees",
};

interface CommitteesPageProps {
  searchParams: Promise<{ edition?: string | string[] }>;
}

export default async function AdminCommitteesPage({
  searchParams,
}: CommitteesPageProps) {
  const params = await searchParams;
  const year = resolveEditionYearParam(params.edition);

  const [actor, data] = await Promise.all([
    requireAdminPageSession(),
    loadAdminCommitteesData(year),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {data.context.editionSubtitle} — Committees
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage Advisory, Scientific, Technical, AAIA, and Organizing committee directories.
        </p>
      </div>

      <CommitteesManager
        editionId={data.context.editionId}
        editionYear={data.context.editionYear}
        committees={data.committees}
        actorRole={actor.role}
        isFallbackRecord={data.context.source === "fallback"}
      />
    </div>
  );
}
