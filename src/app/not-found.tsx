import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader editionYear={2027} editionLabel="MetaSphere 2027" />

      <main className="grow flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white p-8 md:p-12 rounded-2xl shadow-xl text-center border border-gray-100">
          <h1 className="text-7xl md:text-8xl font-extrabold gradient-text leading-tight mb-2">
            404
          </h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Lost in the MetaSphere?
          </h2>
          <p className="text-gray-600 text-base mb-8 leading-relaxed">
            The page you are looking for might have been moved, renamed, or is
            temporarily unavailable. Let&apos;s get you back on track.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg text-sm font-semibold shadow-md transition bg-orange-500 text-white hover:bg-orange-600"
          >
            Return to Home Page
          </Link>
        </div>
      </main>

      <PublicFooter editionYear={2027} />
    </div>
  );
}
