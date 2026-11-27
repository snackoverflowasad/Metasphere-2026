import type { Metadata } from "next";
import type { EditionSnapshot } from "@/types/database";

export interface BuildPublicPageMetadataInput {
  edition: EditionSnapshot;
  path: string;
  pageTitle?: string;
  description: string;
  isArchive?: boolean;
}

/**
 * Resolves consistent per-route Metadata (without duplicate brand suffixes),
 * canonical URLs, OpenGraph, and Twitter card fields for active and archived editions.
 */
export function buildPublicPageMetadata({
  edition,
  path,
  pageTitle,
  description,
  isArchive = false,
}: BuildPublicPageMetadataInput): Metadata {
  const canonicalBase = edition.siteSettings.canonicalUrl.replace(/\/+$/, "");
  const cleanPath = path === "/" ? "" : path;
  const routeUrl = `${canonicalBase}${isArchive ? "/2026" : ""}${cleanPath}` || canonicalBase;
  const editionLabel = edition.edition.subtitle || `MetaSphere ${edition.edition.year}`;

  const resolvedTitle = pageTitle
    ? `${pageTitle} | ${editionLabel}${isArchive ? " (Archived)" : ""}`
    : isArchive
      ? `${editionLabel} (Archived Edition)`
      : edition.siteSettings.seoTitle;

  return {
    title: {
      absolute: resolvedTitle,
    },
    description,
    alternates: {
      canonical: routeUrl,
    },
    openGraph: {
      title: resolvedTitle,
      description,
      url: routeUrl,
      type: "website",
      siteName: editionLabel,
      images: [
        {
          url: `${canonicalBase}/Assets/Logo.png`,
          alt: `${editionLabel} Logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
    },
  };
}
