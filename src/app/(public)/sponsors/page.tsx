import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";
import { SponsorsView } from "@/components/pages/SponsorsView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return buildPublicPageMetadata({
    edition,
    path: "/sponsors",
    pageTitle: "Technical Sponsors",
    description: `Institutions, academic partners, and technical co-sponsors supporting ${edition.edition.subtitle}.`,
  });
}

export default async function SponsorsPage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return <SponsorsView edition={edition} />;
}
