import type { MetadataRoute } from "next";
import { getEditionSnapshot } from "@/features/conference/queries";

const PUBLIC_PATHS = [
  "",
  "/call-for-papers",
  "/paper-submission",
  "/registration",
  "/speakers",
  "/committees/advisory",
  "/committees/scientific",
  "/committees/technical",
  "/committees/aaia",
  "/technical-programs",
  "/sponsors",
  "/contact",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const edition = await getEditionSnapshot();
  const baseUrl = edition.siteSettings.canonicalUrl.replace(/\/+$/, "");
  const lastModified = new Date();

  const activeEntries: MetadataRoute.Sitemap = PUBLIC_PATHS.map((path) => ({
    url: `${baseUrl}${path || "/"}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));

  const archiveEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/2026`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    ...PUBLIC_PATHS.filter(Boolean).map((path) => ({
      url: `${baseUrl}/2026${path}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  return [...activeEntries, ...archiveEntries];
}
