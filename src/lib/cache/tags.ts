import { revalidateTag } from "next/cache";

/**
 * Returns the canonical Next.js cache tag for a conference edition year.
 */
export function editionCacheTag(year: number): string {
  return `edition:${year}`;
}

/**
 * Invalidates cached edition data immediately using Next.js 16's 2-argument `revalidateTag`.
 */
export function revalidateEdition(year: number): void {
  revalidateTag(editionCacheTag(year), { expire: 0 });
}
