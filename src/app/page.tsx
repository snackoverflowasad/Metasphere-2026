import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader editionYear={2027} editionLabel="MetaSphere 2027" />
      <main className="grow max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
          MetaSphere 2027:{" "}
          <span className="gradient-text">
            Global Conference on Cloud Computing, Virtualization &amp; Metaverse
          </span>
        </h1>
      </main>
      <PublicFooter editionYear={2027} />
    </div>
  );
}
