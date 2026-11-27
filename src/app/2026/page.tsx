import type { Metadata } from "next";
import { getEditionSnapshot } from "@/features/conference/queries";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";
import { HomePageView } from "@/components/pages/HomePageView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot(2026);
  return buildPublicPageMetadata({
    edition,
    path: "/",
    description: edition.siteSettings.seoDescription,
    isArchive: true,
  });
}

export default async function Archive2026HomePage() {
  const edition = await getEditionSnapshot(2026);
  return <HomePageView edition={edition} basePath="/2026" />;
}
