import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";
import { CommitteeView } from "@/components/pages/CommitteeView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return buildPublicPageMetadata({
    edition,
    path: "/committees/advisory",
    pageTitle: "Advisory Committee",
    description: `Meet the distinguished members of the Advisory Committee guiding ${edition.edition.subtitle}.`,
  });
}

export default async function AdvisoryCommitteePage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return <CommitteeView edition={edition} category="advisory" />;
}
