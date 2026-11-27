import type { EditionSnapshot } from "@/types/database";
import { DeadlinesSection } from "@/components/deadlines/DeadlinesSection";
import { CloudinaryVideoBg } from "@/components/home/CloudinaryVideoBg";
import { CountdownTimer } from "@/components/home/CountdownTimer";

export interface CallForPapersViewProps {
  edition: EditionSnapshot;
}

export function CallForPapersView({ edition }: CallForPapersViewProps) {
  const { edition: meta, siteSettings, tracks, deadlines, linksByKey } = edition;
  const heroVideo =
    siteSettings.heroMedia.pageVideos.callForPapers ??
    "https://res.cloudinary.com/dh87hfwml/video/upload/v1782834890/MetaSphere2026/Paper.mp4";
  const cmtUrl =
    linksByKey.cmt_submission ??
    "https://cmt3.research.microsoft.com/MetaSphere2026";
  const isArchived = meta.status === "archived";

  return (
    <>
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        <CloudinaryVideoBg videoUrls={[heroVideo]} />
        <div className="relative max-w-5xl mx-auto text-center px-4 z-20">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Call for <span className="gradient-text">Papers</span>
          </h1>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="w-full lg:w-2/3">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100 space-y-4">
              <p className="text-lg text-gray-600 text-justify leading-relaxed">
                {meta.subtitle} serves as a premier two-day international forum
                facilitating the convergence of cutting-edge innovation,
                scholarly research, and industrial expertise. This summit
                assembles a diverse global cohort of researchers, policymakers,
                and technology executives to disseminate breakthroughs and
                analyze the transformative advancements defining the digital
                frontier. By focusing on the intersection of cloud
                infrastructure, virtualization, and the Metaverse ecosystem, the
                conference addresses the systemic shifts currently redefining
                global communication, commerce, healthcare, and immersive
                experiences.
              </p>
              <p className="text-lg text-gray-600 text-justify leading-relaxed">
                The proceedings emphasize critical developments in scalable
                cloud architectures, intelligent virtual environments, digital
                twins, and cybersecurity within virtual domains. Through a
                structured program of plenary addresses by global authorities,
                peer-reviewed technical sessions, and industrial exhibitions,{" "}
                {meta.subtitle} fosters high-level interdisciplinary dialogue
                bridging academic theory and real-world application.
              </p>
            </div>

            <div className="mt-8 sm:mt-12" id="conference-tracks">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
                Conference Topics
              </h2>
              <div className="space-y-4 sm:space-y-6">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="bg-white shadow-lg border border-gray-100 p-6 rounded-2xl"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      {track.code ? `${track.code}: ${track.name}` : track.name}
                    </h3>
                    {track.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {track.description}
                      </p>
                    )}
                    <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
                      {track.topics.map((topic) => (
                        <li key={topic}>
                          <b>{topic}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="w-full lg:w-[350px] shrink-0 space-y-6">
            <DeadlinesSection deadlines={deadlines} />
            <CountdownTimer
              targetDateIso={meta.startDate}
              isArchived={isArchived}
            />
            <div className="sticky top-48">
              <a
                href={cmtUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center btn-register font-bold py-3 sm:py-4 px-4 sm:px-5 rounded-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-sm sm:text-base"
              >
                Submit Your Paper Now
              </a>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
