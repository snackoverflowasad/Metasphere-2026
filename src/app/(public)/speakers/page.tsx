import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";
import { SpeakersView } from "@/components/pages/SpeakersView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return buildPublicPageMetadata({
    edition,
    path: "/speakers",
    pageTitle: "Keynote Speakers",
    description: `Profiles of keynote speakers at ${edition.edition.subtitle}, sharing insights on Cloud Computing, Virtualization, and the Metaverse.`,
  });
}

export default async function SpeakersPage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return <SpeakersView edition={edition} />;
}
