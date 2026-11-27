import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { HomePageView } from "@/components/pages/HomePageView";

export async function generateMetadata(): Promise<Metadata> {
  const isPreview = await isAuthorizedDraftPreview();
  const snapshot = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return {
    title: snapshot.siteSettings.seoTitle,
    description: snapshot.siteSettings.seoDescription,
    alternates: {
      canonical: snapshot.siteSettings.canonicalUrl,
    },
    openGraph: {
      title: snapshot.siteSettings.seoTitle,
      description: snapshot.siteSettings.seoDescription,
      url: snapshot.siteSettings.canonicalUrl,
      type: "website",
    },
  };
}

export default async function PublicHomePage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });

  return <HomePageView edition={edition} />;
}
