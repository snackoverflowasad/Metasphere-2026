import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";
import { CallForPapersView } from "@/components/pages/CallForPapersView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return buildPublicPageMetadata({
    edition,
    path: "/call-for-papers",
    pageTitle: "Call for Papers",
    description: `Submit original unpublished research papers to ${edition.edition.subtitle} across Cloud Computing, Virtualization, Metaverse, Quantum, and AI tracks.`,
  });
}

export default async function CallForPapersPage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });

  return <CallForPapersView edition={edition} />;
}
