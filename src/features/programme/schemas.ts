import { z } from "zod";
import { editionIdSchema } from "@/features/conference/schemas";
import {
  editionYearSchema,
  optionalSafeHttpUrlSchema,
  publicationStatusSchema,
  uuidSchema,
} from "@/lib/validation/common";

export const trackInputSchema = z.object({
  editionId: editionIdSchema,
  editionYear: editionYearSchema.optional(),
  code: z
    .string()
    .trim()
    .min(2, "Track code must be at least 2 characters")
    .max(64),
  name: z.string().trim().min(2, "Track name must be at least 2 characters").max(240),
  description: z.string().trim().max(3000).optional().default(""),
  topics: z.array(z.string().trim().min(1).max(200)).max(50).optional().default([]),
  imageUrl: optionalSafeHttpUrlSchema,
  sortOrder: z.number().int("Sort order must be a whole number").min(0).default(0),
  status: publicationStatusSchema.optional().default("draft"),
});

export type TrackInput = z.input<typeof trackInputSchema>;

const isoTimestampSchema = z
  .string()
  .trim()
  .min(1, "Timestamp is required")
  .refine((val) => Number.isFinite(Date.parse(val)), {
    message: "Must be a valid ISO-8601 timestamp",
  });

export const programSessionInputSchema = z
  .object({
    editionId: editionIdSchema,
    editionYear: editionYearSchema.optional(),
    trackId: uuidSchema("Valid track UUID is required").nullable().optional(),
    speakerId: uuidSchema("Valid speaker UUID is required").nullable().optional(),
    sessionDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Session date must use YYYY-MM-DD format")
      .optional(),
    startsAt: isoTimestampSchema,
    endsAt: isoTimestampSchema,
    title: z.string().trim().min(2, "Session title must be at least 2 characters").max(240),
    description: z.string().trim().max(3000).optional().default(""),
    roomOrLink: z.string().trim().max(300).optional().default(""),
    sortOrder: z.number().int("Sort order must be a whole number").min(0).default(0),
    status: publicationStatusSchema.optional().default("draft"),
  })
  .refine((data) => Date.parse(data.endsAt) >= Date.parse(data.startsAt), {
    message: "End time must be on or after start time",
    path: ["endsAt"],
  });

export type ProgramSessionInput = z.input<typeof programSessionInputSchema>;
