import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";
import { ProgrammeView } from "@/components/pages/ProgrammeView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return buildPublicPageMetadata({
    edition,
    path: "/technical-programs",
    pageTitle: "Technical Programs",
    description: `Technical program schedule, keynote timings (IST), and session details for ${edition.edition.subtitle}.`,
  });
}

export default async function TechnicalProgramsPage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return <ProgrammeView edition={edition} />;
}
