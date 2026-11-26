import { z } from "zod";
import {
  editionYearSchema,
  publicationStatusSchema,
} from "@/lib/validation/common";

export const deadlineInputSchema = z.object({
  id: z.string().trim().uuid().optional(),
  editionId: z.string().trim().uuid("Valid edition UUID is required"),
  editionYear: editionYearSchema,
  title: z.string().trim().min(2, "Deadline title is required").max(160),
  dueAt: z
    .string()
    .trim()
    .min(1, "Due date & time (IST) is required")
    .refine((value) => Number.isFinite(Date.parse(value)), {
      message: "Due date & time must be a valid ISO timestamp",
    }),
  displayDate: z
    .string()
    .trim()
    .min(2, "Display date label is required")
    .max(120),
  originalDate: z.string().trim().max(120).nullable().optional(),
  isExtended: z.boolean(),
  isConferenceDate: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  isVisible: z.boolean(),
  status: publicationStatusSchema,
});

export type DeadlineInput = z.infer<typeof deadlineInputSchema>;
