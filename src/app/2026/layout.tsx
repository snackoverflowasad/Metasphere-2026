import { getEditionSnapshot } from "@/features/conference/queries";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default async function Archive2026Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const snapshot = await getEditionSnapshot(2026);
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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      <PublicHeader
        editionYear={2026}
        editionLabel={snapshot.edition.subtitle}
        isArchived={true}
        basePath="/2026"
      />
      <main id="main-content" className="grow">
        {children}
      </main>
      <PublicFooter
        editionYear={2026}
        links={footerLinks}
        basePath="/2026"
      />
    </div>
  );
}
