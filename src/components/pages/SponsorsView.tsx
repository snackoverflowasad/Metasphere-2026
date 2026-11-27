import type { EditionSnapshot } from "@/types/database";
import { DeadlinesSection } from "@/components/deadlines/DeadlinesSection";
import { CountdownTimer } from "@/components/home/CountdownTimer";

export interface SponsorsViewProps {
  edition: EditionSnapshot;
}

export function SponsorsView({ edition }: SponsorsViewProps) {
  const { edition: meta, sponsors, deadlines } = edition;

  return (
    <>
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-orange-50">
        <div className="max-w-5xl mx-auto text-center px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Technical <span className="gradient-text">Sponsors</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            We are grateful for the generous support of our sponsors and
            partners.
          </p>
        </div>
      </section>

      <div className="flex justify-center items-start px-4 py-12 min-h-[65vh]">
        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 grow">
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="bg-orange-100 p-6 rounded-2xl flex flex-col gap-6 items-center justify-center shadow-md transition-transform hover:scale-105 h-full"
              >
                <img
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  className="w-32 h-32 object-contain rounded-2xl"
                  loading="lazy"
                  decoding="async"
                />
                <h2 className="text-center text-lg font-bold text-gray-800 leading-tight">
                  {sponsor.name}
                </h2>
              </div>
            ))}
          </div>

          <aside className="w-full lg:w-[350px] shrink-0 space-y-6">
            <DeadlinesSection deadlines={deadlines} />
            <CountdownTimer
              targetDateIso={meta.startDate}
              isArchived={meta.status === "archived"}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
