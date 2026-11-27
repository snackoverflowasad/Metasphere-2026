import Link from "next/link";
import {
  getEditionSnapshot,
  isAuthorizedDraftPreview,
} from "@/features/conference/queries";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDraftPreview = await isAuthorizedDraftPreview();
  const snapshot = await getEditionSnapshot(undefined, {
    includeDrafts: isDraftPreview,
  });

  const footerLinks: Record<string, string> = {
    ...snapshot.linksByKey,
    ...(snapshot.edition.contactEmails[0]
      ? { email: snapshot.edition.contactEmails[0] }
      : {}),
    ...(snapshot.edition.contactPhones[0]
      ? { phone: snapshot.edition.contactPhones[0] }
      : {}),
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fffbf5] text-[#1a202c]">
      {isDraftPreview && (
        <div className="bg-orange-700 text-white text-xs sm:text-sm py-1.5 px-4 text-center">
          Admin Draft Preview Mode is active for {snapshot.edition.subtitle}.{" "}
          <a
            href="/api/preview?disable=1&redirect=/"
            className="underline font-semibold ml-2 hover:text-orange-100"
          >
            Exit Preview
          </a>
          <Link
            href={`/admin/overview?edition=${snapshot.edition.year}`}
            className="underline font-semibold ml-3 hover:text-orange-100"
          >
            Back to Admin
          </Link>
        </div>
      )}

      <PublicHeader
        editionYear={snapshot.edition.year}
        editionLabel={snapshot.edition.subtitle}
        isArchived={snapshot.edition.status === "archived"}
      />

      <main className="grow">{children}</main>

      <PublicFooter
        editionYear={snapshot.edition.year}
        links={footerLinks}
      />
    </div>
  );
}
