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
    path: "/committees/aaia",
    pageTitle: "AAIA Committee",
    description: `Meet the AAIA Kolkata Branch Advisory Committee supporting ${edition.edition.subtitle}.`,
  });
}

export default async function AaiaCommitteePage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return <CommitteeView edition={edition} category="aaia" />;
}
