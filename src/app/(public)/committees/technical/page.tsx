import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { CommitteeView } from "@/components/pages/CommitteeView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return {
    title: `Technical Program Committee | ${edition.edition.subtitle}`,
    description: `Meet the reviewers and Technical Program Committee of ${edition.edition.subtitle}.`,
  };
}

export default async function TechnicalCommitteePage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return <CommitteeView edition={edition} category="technical" />;
}
