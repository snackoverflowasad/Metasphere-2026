import { z } from "zod";
import {
  editionYearSchema,
  publicationStatusSchema,
  safeHttpUrlSchema,
} from "@/lib/validation/common";

export const conferenceLinkSchema = z.object({
  id: z.string().trim().uuid().optional(),
  editionId: z.string().trim().uuid("Valid edition UUID is required"),
  editionYear: editionYearSchema,
  key: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9_]+$/,
      "Key must use lowercase letters, digits, or underscores only"
    )
    .min(2)
    .max(64),
  label: z.string().trim().min(2, "Label is required").max(200),
  url: safeHttpUrlSchema,
  status: publicationStatusSchema,
});

export type ConferenceLinkInput = z.infer<typeof conferenceLinkSchema>;

export const resourceInputSchema = z
  .object({
    id: z.string().trim().uuid().optional(),
    editionId: z.string().trim().uuid("Valid edition UUID is required"),
    editionYear: editionYearSchema,
    label: z.string().trim().min(2, "Resource label is required").max(200),
    category: z.string().trim().min(2, "Category is required").max(80),
    url: z.union([safeHttpUrlSchema, z.literal(""), z.null()]).optional(),
    storagePath: z.string().trim().max(300).nullable().optional(),
    sortOrder: z.number().int().min(0).max(999),
    status: publicationStatusSchema,
  })
  .refine(
    (data) =>
      Boolean(
        (data.url && data.url.trim().length > 0) ||
          (data.storagePath && data.storagePath.trim().length > 0)
      ),
    {
      message: "Provide either an external http(s) URL or a storage asset path.",
      path: ["url"],
    }
  );

export type ResourceInput = z.infer<typeof resourceInputSchema>;
