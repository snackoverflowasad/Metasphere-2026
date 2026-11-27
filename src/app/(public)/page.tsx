import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";
import { HomePageView } from "@/components/pages/HomePageView";

export async function generateMetadata(): Promise<Metadata> {
  const isPreview = await isAuthorizedDraftPreview();
  const snapshot = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return buildPublicPageMetadata({
    edition: snapshot,
    path: "/",
    description: snapshot.siteSettings.seoDescription,
  });
}

export default async function PublicHomePage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });

  return <HomePageView edition={edition} />;
}
