import { z } from "zod";
import { editionIdSchema } from "@/features/conference/schemas";
import {
  editionYearSchema,
  optionalSafeHttpUrlSchema,
  publicationStatusSchema,
  uuidSchema,
} from "@/lib/validation/common";

export const committeeCategorySchema = z.enum([
  "advisory",
  "scientific",
  "technical",
  "aaia",
  "organizing",
]);

export const speakerInputSchema = z.object({
  editionId: editionIdSchema,
  editionYear: editionYearSchema.optional(),
  personId: uuidSchema("Valid person UUID is required").optional(),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(200),
  designation: z.string().trim().max(200).optional().default(""),
  institution: z.string().trim().max(300).optional().default(""),
  country: z.string().trim().max(120).optional().default(""),
  bio: z.string().trim().max(4000).optional().default(""),
  photoUrl: optionalSafeHttpUrlSchema,
  speakerType: z.string().trim().min(2).max(60).optional().default("keynote"),
  talkTitle: z.string().trim().max(300).optional().default(""),
  talkAbstract: z.string().trim().max(5000).optional().default(""),
  imageAlt: z.string().trim().max(240).optional().default(""),
  sortOrder: z.number().int("Sort order must be a whole number").min(0).default(0),
  status: publicationStatusSchema.optional().default("draft"),
});

export type SpeakerInput = z.input<typeof speakerInputSchema>;

export const committeeInputSchema = z.object({
  editionId: editionIdSchema,
  editionYear: editionYearSchema.optional(),
  slug: z
    .string()
    .trim()
    .min(2, "Committee slug is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, digits, or hyphens"),
  name: z.string().trim().min(2, "Committee name must be at least 2 characters").max(200),
  category: committeeCategorySchema,
  description: z.string().trim().max(2000).optional().default(""),
  sortOrder: z.number().int("Sort order must be a whole number").min(0).default(0),
  status: publicationStatusSchema.optional().default("draft"),
});

export type CommitteeInput = z.input<typeof committeeInputSchema>;

export const committeeMemberInputSchema = z.object({
  committeeId: uuidSchema("Valid committee UUID is required"),
  editionId: editionIdSchema,
  editionYear: editionYearSchema.optional(),
  personId: uuidSchema("Valid person UUID is required").optional(),
  fullName: z.string().trim().min(2, "Member name must be at least 2 characters").max(200),
  designation: z.string().trim().max(200).optional().default(""),
  institution: z.string().trim().max(300).optional().default(""),
  country: z.string().trim().max(120).optional().default(""),
  photoUrl: optionalSafeHttpUrlSchema,
  roleLabel: z.string().trim().max(200).optional().default(""),
  groupName: z.string().trim().max(160).optional().default(""),
  nationalityGroup: z.enum(["national", "international"]).default("national"),
  sortOrder: z.number().int("Sort order must be a whole number").min(0).default(0),
  status: publicationStatusSchema.optional().default("draft"),
});

export type CommitteeMemberInput = z.input<typeof committeeMemberInputSchema>;
