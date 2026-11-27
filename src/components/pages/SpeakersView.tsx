import type { EditionSnapshot } from "@/types/database";
import { SpeakerGrid } from "@/components/speakers/SpeakerGrid";

export interface SpeakersViewProps {
  edition: EditionSnapshot;
}

export function SpeakersView({ edition }: SpeakersViewProps) {
  return (
    <>
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-orange-50">
        <div className="max-w-5xl mx-auto text-center px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Keynote <span className="gradient-text">Speakers</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Insights from the visionaries shaping our digital future.
          </p>
        </div>
      </section>

      <div className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-14 text-center">
            Keynote Speakers — {edition.edition.subtitle}
          </h2>
          <SpeakerGrid speakers={edition.speakers} />
        </div>
      </div>
    </>
  );
}
