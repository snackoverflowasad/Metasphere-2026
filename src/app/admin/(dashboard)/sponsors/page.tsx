import type { Metadata } from "next";
import { requireAdminPageSession } from "@/lib/auth/session";
import { resolveEditionYearParam } from "@/lib/cms/admin-data";
import { loadAdminSponsorsData } from "@/lib/cms/admin-modules";
import { SponsorsManager } from "./SponsorsManager";

export const metadata: Metadata = {
  title: "Sponsors",
};

interface SponsorsPageProps {
  searchParams: Promise<{ edition?: string | string[] }>;
}

export default async function AdminSponsorsPage({
  searchParams,
}: SponsorsPageProps) {
  const params = await searchParams;
  const year = resolveEditionYearParam(params.edition);

  const [actor, data] = await Promise.all([
    requireAdminPageSession(),
    loadAdminSponsorsData(year),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {data.context.editionSubtitle} — Sponsors & Partners
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage technical co-sponsors, partner tiers, logos, and website links.
        </p>
      </div>

      <SponsorsManager
        editionId={data.context.editionId}
        editionYear={data.context.editionYear}
        sponsors={data.sponsors}
        actorRole={actor.role}
        isFallbackRecord={data.context.source === "fallback"}
      />
    </div>
  );
}
