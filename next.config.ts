import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security/headers";

export interface LegacyRedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

interface InventoryEntry {
  source: string;
  destination: string;
}

/**
 * Loads all legacy 2026 `.html` routes from `docs/migration/legacy-inventory.json`
 * and returns permanent (308) Next.js redirect definitions.
 */
export async function legacyHtmlRedirects(): Promise<LegacyRedirectRule[]> {
  const inventoryPath = path.join(
    process.cwd(),
    "docs/migration/legacy-inventory.json"
  );
  const raw = fs.readFileSync(inventoryPath, "utf8");
  const inventory = JSON.parse(raw) as { legacyRedirects: InventoryEntry[] };

  return inventory.legacyRedirects.map((entry) => ({
    source: entry.source.startsWith("/") ? entry.source : `/${entry.source}`,
    destination: entry.destination,
    permanent: true,
  }));
}

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return legacyHtmlRedirects();
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
