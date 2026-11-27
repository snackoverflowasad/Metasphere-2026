import type { MetadataRoute } from "next";
import { getEditionSnapshot } from "@/features/conference/queries";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const edition = await getEditionSnapshot();
  const baseUrl =
    edition.siteSettings.canonicalUrl.replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://metasphere2027.iem.edu.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
