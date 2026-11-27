import type { Metadata } from "next";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { buildPublicPageMetadata } from "@/lib/seo/metadata";
import { PaperSubmissionView } from "@/components/pages/PaperSubmissionView";

export async function generateMetadata(): Promise<Metadata> {
  const edition = await getEditionSnapshot();
  return buildPublicPageMetadata({
    edition,
    path: "/paper-submission",
    pageTitle: "Paper Submission",
    description: `Submit research papers via Microsoft CMT to ${edition.edition.subtitle}. Find author templates, guidelines, and presentation modes.`,
  });
}

export default async function PaperSubmissionPage() {
  const isPreview = await isAuthorizedDraftPreview();
  const edition = await getEditionSnapshot(undefined, {
    includeDrafts: isPreview,
  });

  return <PaperSubmissionView edition={edition} />;
}
