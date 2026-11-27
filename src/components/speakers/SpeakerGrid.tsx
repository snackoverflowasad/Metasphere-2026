import type { SpeakerSnapshot } from "@/types/database";

export interface SpeakerGridProps {
  speakers: SpeakerSnapshot[];
}

function resolvePhotoSrc(photoUrl: string): string {
  if (!photoUrl) return "/Assets/Logo.png";
  if (/^https?:\/\//i.test(photoUrl) || photoUrl.startsWith("/")) {
    return photoUrl;
  }
  return `/${photoUrl}`;
}

export function SpeakerGrid({ speakers }: SpeakerGridProps) {
  if (speakers.length === 0) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-10 md:p-16 rounded-2xl shadow-md text-center border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          To Be Announced Soon
        </h2>
        <p className="text-gray-600 text-lg">
          Stay tuned for speaker announcements.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {speakers.map((speaker) => (
        <article
          key={speaker.id}
          className="group relative overflow-hidden rounded-3xl bg-white border border-gray-200 shadow-sm transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl"
        >
          <div className="relative overflow-hidden bg-gray-100">
            <img
              src={resolvePhotoSrc(speaker.photoUrl)}
              alt={speaker.imageAlt || speaker.fullName}
              className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent opacity-80" />
          </div>

          <div className="p-6 text-center">
            <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors duration-300">
              {speaker.fullName}
            </h3>

            {speaker.affiliations.length > 0 ? (
              speaker.affiliations.map((aff) => (
                <p
                  key={aff}
                  className="mt-2 text-sm leading-relaxed text-gray-500"
                >
                  {aff}
                </p>
              ))
            ) : (
              speaker.institution && (
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {speaker.institution}
                </p>
              )
            )}

            {speaker.talkTitle && (
              <p className="mt-2 text-xs font-medium text-orange-700">
                {speaker.talkTitle}
              </p>
            )}

            <div className="mx-auto mt-5 h-1 w-10 rounded-full bg-orange-500 transition-all duration-300 group-hover:w-20" />
          </div>
        </article>
      ))}
    </div>
  );
}
