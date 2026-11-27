import type { EditionSnapshot } from "@/types/database";
import { CloudinaryVideoBg } from "@/components/home/CloudinaryVideoBg";
import { ProgrammeSchedule } from "@/components/programme/ProgrammeSchedule";

export interface ProgrammeViewProps {
  edition: EditionSnapshot;
}

export function ProgrammeView({ edition }: ProgrammeViewProps) {
  const heroVideo =
    edition.siteSettings.heroMedia.pageVideos.technicalPrograms ??
    "https://res.cloudinary.com/dh87hfwml/video/upload/v1782834933/MetaSphere2026/4198845-hd_1920_1080_25fps.mp4";

  return (
    <>
      <section className="relative pt-32 pb-20 sm:pt-48 sm:pb-24 overflow-hidden">
        <CloudinaryVideoBg videoUrls={[heroVideo]} />
        <div className="relative max-w-5xl mx-auto text-center px-4 z-20">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Technical <span className="gradient-text">Programs</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Explore the comprehensive technical program and conference schedule.
          </p>
        </div>
      </section>

      <div className="py-16 md:py-24">
        <div className="text-center mb-12 px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Program Schedule
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            All session times listed in IST (UTC+5:30)
          </p>
        </div>

        <ProgrammeSchedule
          sessions={edition.programSessions}
          tracks={edition.tracks}
          speakers={edition.speakers}
          qrAssetPath={edition.edition.programScheduleQrAsset}
        />
      </div>
    </>
  );
}
