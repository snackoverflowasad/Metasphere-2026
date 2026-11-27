import type { CommitteeCategory, EditionSnapshot } from "@/types/database";
import { CommitteeDirectory } from "@/components/committees/CommitteeDirectory";
import { CloudinaryVideoBg } from "@/components/home/CloudinaryVideoBg";

export interface CommitteeViewProps {
  edition: EditionSnapshot;
  category: CommitteeCategory;
}

const COMMITTEE_UI: Record<
  CommitteeCategory,
  {
    headingLead: string;
    headingAccent: string;
    subtitle: (editionLabel: string) => string;
    videoKey?: string;
  }
> = {
  advisory: {
    headingLead: "Advisory",
    headingAccent: "Committee",
    subtitle: () => "Meet the members of our esteemed Advisory Committee.",
    videoKey: "advisoryCommittee",
  },
  scientific: {
    headingLead: "Scientific",
    headingAccent: "Committee",
    subtitle: (editionLabel) =>
      `Meet the distinguished members of our leadership and scientific committee for ${editionLabel}.`,
    videoKey: "scientificCommittee",
  },
  technical: {
    headingLead: "Technical Program",
    headingAccent: "Committee",
    subtitle: () =>
      "Meet the distinguished members of our Technical Program Committee.",
    videoKey: "technicalCommittee",
  },
  aaia: {
    headingLead: "AAIA - Kolkata Branch Advisory",
    headingAccent: "Committee",
    subtitle: (editionLabel) =>
      `Meet the distinguished members of our AAIA Committee supporting ${editionLabel}.`,
  },
  organizing: {
    headingLead: "Organizing",
    headingAccent: "Committee",
    subtitle: (editionLabel) =>
      `Organizing committee coordinating ${editionLabel}.`,
  },
};

export function CommitteeView({ edition, category }: CommitteeViewProps) {
  const committee = edition.committees.find((c) => c.category === category);
  const config = COMMITTEE_UI[category];
  const videoUrl = config.videoKey
    ? edition.siteSettings.heroMedia.pageVideos[config.videoKey]
    : undefined;

  return (
    <>
      {videoUrl ? (
        <section className="relative pt-32 pb-20 sm:pt-48 sm:pb-24 overflow-hidden">
          <CloudinaryVideoBg videoUrls={[videoUrl]} />
          <div className="relative max-w-5xl mx-auto text-center px-4 z-20">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
              {config.headingLead}{" "}
              <span className="gradient-text">{config.headingAccent}</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              {config.subtitle(edition.edition.subtitle)}
            </p>
          </div>
        </section>
      ) : (
        <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-orange-50">
          <div className="max-w-5xl mx-auto text-center px-4">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
              {config.headingLead}{" "}
              <span className="gradient-text">{config.headingAccent}</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              {config.subtitle(edition.edition.subtitle)}
            </p>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 py-12">
        {committee ? (
          <CommitteeDirectory committee={committee} />
        ) : (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
            Committee roster will be published soon.
          </div>
        )}
      </div>
    </>
  );
}
