import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";
import { RegistrationView } from "@/components/pages/RegistrationView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return buildPublicPageMetadata({
    edition,
    path: "/registration",
    pageTitle: "Registration",
    description: `Registration fee categories, Indian/Foreign author rates, bank transfer NEFT/RTGS, and UPI details for ${edition.edition.subtitle}.`,
  });
}

export default async function RegistrationPage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });

  return <RegistrationView edition={edition} />;
}
