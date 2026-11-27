import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { ProgrammeView } from "@/components/pages/ProgrammeView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return {
    title: `Technical Programs | ${edition.edition.subtitle}`,
    description: `Technical program schedule, keynote timings (IST), and session details for ${edition.edition.subtitle}.`,
  };
}

export default async function TechnicalProgramsPage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return <ProgrammeView edition={edition} />;
}
