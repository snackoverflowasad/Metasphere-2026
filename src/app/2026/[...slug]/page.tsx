import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEditionSnapshot } from "@/features/conference/queries";
import { CallForPapersView } from "@/components/pages/CallForPapersView";
import { CommitteeView } from "@/components/pages/CommitteeView";
import { ContactView } from "@/components/pages/ContactView";
import { PaperSubmissionView } from "@/components/pages/PaperSubmissionView";
import { ProgrammeView } from "@/components/pages/ProgrammeView";
import { RegistrationView } from "@/components/pages/RegistrationView";
import { SpeakersView } from "@/components/pages/SpeakersView";
import { SponsorsView } from "@/components/pages/SponsorsView";

const ARCHIVE_SLUGS: string[][] = [
  ["call-for-papers"],
  ["paper-submission"],
  ["registration"],
  ["speakers"],
  ["committees", "advisory"],
  ["committees", "scientific"],
  ["committees", "technical"],
  ["committees", "aaia"],
  ["technical-programs"],
  ["sponsors"],
  ["contact"],
];

const TITLES: Record<string, string> = {
  "call-for-papers": "Call for Papers",
  "paper-submission": "Paper Submission",
  registration: "Registration",
  speakers: "Keynote Speakers",
  "committees/advisory": "Advisory Committee",
  "committees/scientific": "Scientific Committee",
  "committees/technical": "Technical Program Committee",
  "committees/aaia": "AAIA Committee",
  "technical-programs": "Technical Programs",
  sponsors: "Technical Sponsors",
  contact: "Contact Us",
};

export function generateStaticParams() {
  return ARCHIVE_SLUGS.map((slug) => ({ slug }));
}

interface Archive2026SubPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({
  params,
}: Archive2026SubPageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join("/");
  const title = TITLES[path];
  if (!title) {
    return { title: "Archive Not Found | MetaSphere 2026" };
  }
  return {
    title: `${title} | MetaSphere 2026 (Archived)`,
    description: `Archived ${title} details for MetaSphere 2026 (21st & 22nd August, 2026, IEM Kolkata).`,
  };
}

export default async function Archive2026SubPage({
  params,
}: Archive2026SubPageProps) {
  const { slug } = await params;
  const path = slug.join("/");
  const edition = await getEditionSnapshot(2026);

  switch (path) {
    case "call-for-papers":
      return <CallForPapersView edition={edition} />;
    case "paper-submission":
      return <PaperSubmissionView edition={edition} />;
    case "registration":
      return <RegistrationView edition={edition} />;
    case "speakers":
      return <SpeakersView edition={edition} />;
    case "committees/advisory":
      return <CommitteeView edition={edition} category="advisory" />;
    case "committees/scientific":
      return <CommitteeView edition={edition} category="scientific" />;
    case "committees/technical":
      return <CommitteeView edition={edition} category="technical" />;
    case "committees/aaia":
      return <CommitteeView edition={edition} category="aaia" />;
    case "technical-programs":
      return <ProgrammeView edition={edition} />;
    case "sponsors":
      return <SponsorsView edition={edition} />;
    case "contact":
      return <ContactView edition={edition} />;
    default:
      notFound();
  }
}
