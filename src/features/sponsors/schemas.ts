import { z } from "zod";
import { editionIdSchema } from "@/features/conference/schemas";
import {
  editionYearSchema,
  optionalSafeHttpUrlSchema,
  publicationStatusSchema,
  safeHttpUrlSchema,
} from "@/lib/validation/common";

export const sponsorTierSchema = z.enum([
  "technical_sponsor",
  "platinum",
  "gold",
  "silver",
  "bronze",
  "supporter",
]);

export const sponsorInputSchema = z.object({
  editionId: editionIdSchema,
  editionYear: editionYearSchema.optional(),
  name: z.string().trim().min(2, "Sponsor name must be at least 2 characters").max(200),
  tier: sponsorTierSchema.default("technical_sponsor"),
  logoUrl: safeHttpUrlSchema,
  websiteUrl: optionalSafeHttpUrlSchema,
  description: z.string().trim().max(2000).optional().default(""),
  sortOrder: z.number().int("Sort order must be a whole number").min(0).default(0),
  status: publicationStatusSchema.optional().default("draft"),
});

export type SponsorInput = z.input<typeof sponsorInputSchema>;
