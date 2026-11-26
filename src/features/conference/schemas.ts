import { z } from "zod";
import {
  editionYearSchema,
  publicationStatusSchema,
  safeHttpUrlSchema,
} from "@/lib/validation/common";
import { IST_TIMEZONE } from "@/lib/dates/ist";

export const editionIdSchema = z
  .string()
  .trim()
  .uuid("Valid edition UUID is required");

export const publishableTableSchema = z.enum([
  "conference_editions",
  "site_settings",
  "deadlines",
  "tracks",
  "speakers",
  "committees",
  "committee_members",
  "sponsors",
  "program_sessions",
  "resources",
  "conference_links",
  "registration_fees",
]);

const isoTimestampSchema = z
  .string()
  .trim()
  .min(1, "Date and time is required")
  .refine((value) => Number.isFinite(Date.parse(value)), {
    message: "Must be a valid ISO-8601 date/time",
  });

export const updateEditionSettingsSchema = z
  .object({
    editionYear: editionYearSchema,
    title: z.string().trim().min(3, "Conference title is required").max(300),
    subtitle: z.string().trim().max(150).optional().default(""),
    tagline: z.string().trim().max(300).optional().default(""),
    loaderSubtitle: z.string().trim().max(200).optional().default(""),
    datesDisplay: z
      .string()
      .trim()
      .min(2, "Display dates text is required")
      .max(120),
    startDate: isoTimestampSchema,
    endDate: isoTimestampSchema,
    timezone: z.literal(IST_TIMEZONE, {
      error: "Conference timezone must be Asia/Kolkata (IST UTC+5:30).",
    }),
    venueName: z.string().trim().min(2, "Venue name is required").max(200),
    venueAddress: z.string().trim().max(400).optional().default(""),
    venueCity: z.string().trim().max(120).optional().default(""),
    format: z.enum(["online", "offline", "hybrid"]),
    description: z.string().trim().max(4000).optional().default(""),
    technicalCoSponsorsSummary: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),
    cmtAcknowledgment: z.string().trim().max(2000).nullable().optional(),
    publicationNote: z.string().trim().max(2000).nullable().optional(),
    contactEmails: z
      .array(z.string().trim().email("Each contact email must be valid"))
      .max(10),
    contactPhones: z
      .array(z.string().trim().min(3, "Phone number is too short").max(40))
      .max(10),
    canonicalUrl: safeHttpUrlSchema,
    seoTitle: z.string().trim().min(3, "SEO title is required").max(200),
    seoDescription: z
      .string()
      .trim()
      .min(10, "SEO description must be at least 10 characters")
      .max(500),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => Date.parse(data.endDate) >= Date.parse(data.startDate),
    {
      message: "End date/time must be on or after start date/time.",
      path: ["endDate"],
    }
  );

export type EditionSettingsInput = z.infer<typeof updateEditionSettingsSchema>;

export const publishContentSchema = z.object({
  table: publishableTableSchema,
  id: z.string().trim().uuid("Valid record UUID is required"),
  editionYear: editionYearSchema,
  nextStatus: publicationStatusSchema,
});
