import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { CommitteeView } from "@/components/pages/CommitteeView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return {
    title: `Advisory Committee | ${edition.edition.subtitle}`,
    description: `Meet the distinguished members of the Advisory Committee guiding ${edition.edition.subtitle}.`,
  };
}

export default async function AdvisoryCommitteePage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return <CommitteeView edition={edition} category="advisory" />;
}
