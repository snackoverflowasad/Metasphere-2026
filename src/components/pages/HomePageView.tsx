import Link from "next/link";
import { FilePlus2, MapPin } from "lucide-react";
import type { EditionSnapshot } from "@/types/database";
import { buildEventJsonLd, serializeJsonLd } from "@/features/conference/queries";
import { DeadlinesSection } from "@/components/deadlines/DeadlinesSection";
import { ImageFadeCarousel } from "@/components/home/Carousels";
import { CloudinaryVideoBg } from "@/components/home/CloudinaryVideoBg";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { TrackModalButton } from "@/components/home/TrackModal";

export interface EditionViewProps {
  edition: EditionSnapshot;
  basePath?: string;
}

function buildHref(basePath: string | undefined, path: string): string {
  const cleanBase = basePath ? basePath.replace(/\/+$/, "") : "";
  return `${cleanBase}${path}`;
}

function resolvePublicAssetPath(assetPath: string): string {
  if (/^https?:\/\//i.test(assetPath) || assetPath.startsWith("/")) {
    return assetPath;
  }
  return `/${assetPath}`;
}

export function HomePageView({ edition, basePath }: EditionViewProps) {
  const { edition: meta, siteSettings, deadlines, tracks } = edition;
  const isArchived = meta.status === "archived";
  const eventJsonLd = buildEventJsonLd(edition);
  const bookCoverSrc = resolvePublicAssetPath(meta.publicationBookCoverAsset);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventJsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative pt-10 pb-20 overflow-hidden">
        <CloudinaryVideoBg videoUrls={siteSettings.heroMedia.heroVideos} />

        <div className="relative max-w-5xl mx-auto text-center px-4 z-20">
          <div className="inline-block bg-orange-100 text-orange-800 text-xs font-semibold px-4 py-1 rounded-full mb-6">
            <span className="mr-2" aria-hidden="true">
              🏛️
            </span>
            {meta.tagline || "Prudent thinking to pragmatic future"}
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
            {meta.subtitle}: Global Conference on
            <br className="hidden md:block" />{" "}
            <span className="gradient-text">
              Cloud Computing, Virtualization &amp; Metaverse
            </span>
          </h1>

          <div className="mx-5 mt-4 text-orange-600">
            <h2 className="font-semibold text-base">Organized by</h2>
            {meta.organizers.map((org, idx) => (
              <div key={org}>
                <p className="text-lg font-bold">{org}</p>
                {idx === 0 && meta.organizers.length > 1 && (
                  <p className="text-lg font-bold">And</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-xl text-gray-700">
            <div className="flex items-center space-x-2">
              <MapPin className="w-6 h-6 text-orange-600 shrink-0" />
              <span>
                {meta.venueName}, {meta.venueCity}
              </span>
            </div>
          </div>

          {meta.collaborators.length > 0 && (
            <p className="mt-4 text-sm sm:text-base text-gray-700 max-w-3xl mx-auto text-center">
              In collaboration with {meta.collaborators.join(", ")}.
            </p>
          )}

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href={buildHref(basePath, "/registration")}
              className="flex items-center space-x-2 btn-register px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <FilePlus2 className="w-5 h-5" />
              <span>Register Now</span>
            </Link>

            <TrackModalButton tracks={tracks} />

            {meta.technicalCoSponsorsSummary && (
              <div className="mx-5 mt-2 text-orange-600 w-full">
                <p className="text-lg font-bold">
                  {meta.technicalCoSponsorsSummary}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 md:py-28 bg-white/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-12">
            {meta.cmtAcknowledgment && (
              <div className="mb-8 space-y-1 max-w-4xl">
                <p className="text-gray-700 text-lg font-bold">
                  CMT ACKNOWLEDGMENT:
                </p>
                <p className="text-gray-700 text-sm text-justify">
                  {meta.cmtAcknowledgment}
                </p>
              </div>
            )}

            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Welcome to {meta.subtitle}
            </h2>
            <p className="text-gray-700 text-lg max-w-4xl text-justify">
              {meta.description}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 grid md:grid-cols-2 gap-8 items-start">
              <ImageFadeCarousel
                id="tech-carousel"
                images={siteSettings.heroMedia.overviewCarouselImages}
                altPrefix="MetaSphere technology highlight"
                intervalMs={3000}
              />

              <div className="space-y-4 text-gray-700">
                <h3 className="text-2xl font-semibold text-gray-900">
                  MetaSphere Overview
                </h3>
                <p className="text-sm leading-relaxed text-justify">
                  The aim is to foster cross-disciplinary dialogue, showcase
                  cutting-edge work, and accelerate deployment of integrated
                  systems that underpin future metaverse infrastructures.
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-justify">
                  <li>
                    The metaverse requires robust underlying infrastructure:
                    scalable cloud, virtualization, edge computing, and
                    distributed services.
                  </li>
                  <li>
                    Virtualization technologies (compute, network, storage) are
                    foundational to how metaverse systems will scale, isolate,
                    and orchestrate workloads.
                  </li>
                  <li>
                    Integrating real-world systems (IoT, digital twins,
                    real-time simulation) with metaverse layers requires new
                    architectural patterns.
                  </li>
                  <li>
                    Business, governance, security, privacy, economics, and user
                    experience challenges abound; this conference addresses them
                    jointly.
                  </li>
                  <li>
                    The conference is timely: the global metaverse ecosystem
                    continues to expand rapidly across research and industry.
                  </li>
                </ul>
              </div>
            </div>

            <aside className="w-full lg:w-[350px] shrink-0 space-y-6">
              <DeadlinesSection deadlines={deadlines} />
              <CountdownTimer
                targetDateIso={meta.startDate}
                isArchived={isArchived}
              />
            </aside>
          </div>
        </div>
      </section>

      {/* Springer LNNS Proceedings Strip */}
      <div className="w-full max-w-4xl mx-auto p-4 my-8 flex flex-col sm:flex-row items-center justify-start gap-4 bg-transparent">
        <div className="shrink-0 w-40 sm:w-48 bg-white p-0.5 border border-gray-200 rounded shadow-sm flex items-center justify-center">
          <img
            src={bookCoverSrc}
            alt="Springer LNNS Book Cover"
            className="w-full h-auto object-contain block"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="grow text-center sm:text-left">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 tracking-tight leading-snug m-0">
            {meta.publicationNote}
          </h3>
        </div>
      </div>

      {/* About IEM */}
      <section id="about-iem" className="py-20 md:py-28 bg-white/40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              About IEM
            </h2>
            <p className="text-gray-700 text-lg max-w-4xl text-justify">
              The IEM group is an acclaimed educational group amongst
              industry-centred academic training organisations, setting high
              standards in technical and managerial education while focusing on
              research and development.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <ImageFadeCarousel
              id="iem-carousel"
              images={siteSettings.heroMedia.eventGalleryImages}
              altPrefix="IEM Kolkata campus and event highlight"
              intervalMs={5000}
            />

            <div className="space-y-6 text-gray-700">
              <h3 className="text-2xl font-semibold text-gray-900">
                IEM Overview
              </h3>
              <p className="text-justify leading-relaxed">
                The IEM group is an acclaimed educational group amongst the
                industry-centred academic training organisations of today. IEM
                has set sublime standards in addressing the technical and
                managerial resource shortage in the new era of dynamic
                globalisation. IEM is one of the top-ranked engineering colleges
                in Kolkata and Eastern India with strong foundations in teaching
                and R&amp;D across computer science, cloud, and electronics.
              </p>
              <ul className="list-disc list-inside space-y-2 text-justify">
                <li>
                  Ranked &lsquo;A&rsquo; Category by NAAC (National Assessment
                  and Accreditation Council)
                </li>
                <li>
                  Winner of the &ldquo;Jewel of the East&rdquo; title by
                  Telegraph
                </li>
                <li>
                  Ranked 3rd best engineering college in West Bengal by NIRF,
                  Ministry of HRD, Govt of India, and 79th all over India
                </li>
                <li>Awarded &ldquo;Picture Perfect&rdquo; by ABP Group</li>
                <li>
                  Achieved Best Institute of India in Star News Award
                </li>
                <li>
                  Strong placement record: 1-2 job offers on average for every
                  student since inception
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
