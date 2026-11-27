import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";
import { ContactView } from "@/components/pages/ContactView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return buildPublicPageMetadata({
    edition,
    path: "/contact",
    pageTitle: "Contact Us",
    description: `Get in touch with the ${edition.edition.subtitle} organizing committee at IEM Kolkata.`,
  });
}

export default async function ContactPage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });
  return <ContactView edition={edition} />;
}
