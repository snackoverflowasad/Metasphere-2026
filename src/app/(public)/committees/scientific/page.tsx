import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { CommitteeView } from "@/components/pages/CommitteeView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return {
    title: `Scientific Committee | ${edition.edition.subtitle}`,
    description: `Leadership, Patrons, Honorary Chairs, General Chairs, and Scientific Committee of ${edition.edition.subtitle}.`,
  };
}

export default async function ScientificCommitteePage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return <CommitteeView edition={edition} category="scientific" />;
}
