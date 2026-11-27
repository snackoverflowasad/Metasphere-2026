import { z } from "zod";
import { editionIdSchema } from "@/features/conference/schemas";
import { editionYearSchema, publicationStatusSchema } from "@/lib/validation/common";

export const paymentInstructionsSchema = z.object({
  taxNote: z.string().trim().max(300).default("Rates are Inclusive of 18% GST"),
  paymentMethodsNote: z.string().trim().max(1000).default(""),
  upiId: z.string().trim().max(160).default(""),
  bankTransfer: z.object({
    bankName: z.string().trim().max(200).default(""),
    partyName: z.string().trim().max(200).default(""),
    accountNo: z.string().trim().max(80).default(""),
    accountType: z.string().trim().max(80).default(""),
    ifscCode: z.string().trim().max(40).default(""),
    branch: z.string().trim().max(200).default(""),
    swiftCode: z.string().trim().max(40).default(""),
    micr: z.string().trim().max(40).default(""),
  }),
  policies: z.array(z.string().trim().min(1).max(500)).max(25).default([]),
  confirmationEmailInstruction: z.string().trim().max(1000).default(""),
  cancellationPolicy: z.string().trim().max(1000).default(""),
});

export type PaymentInstructionsInput = z.input<typeof paymentInstructionsSchema>;

export const registrationFeeSchema = z.object({
  editionId: editionIdSchema,
  editionYear: editionYearSchema.optional(),
  category: z.string().trim().min(2, "Category must be at least 2 characters").max(200),
  amountInr: z.number().int("INR amount must be a whole integer").min(0, "INR amount must be >= 0"),
  amountUsd: z.number().int("USD amount must be a whole integer").min(0, "USD amount must be >= 0"),
  indianDisplay: z.string().trim().max(120).optional().default(""),
  foreignDisplay: z.string().trim().max(120).optional().default(""),
  taxNote: z.string().trim().max(300).optional().default(""),
  sortOrder: z.number().int("Sort order must be a whole number").min(0).default(0),
  status: publicationStatusSchema.optional().default("draft"),
});

export type RegistrationFeeInput = z.input<typeof registrationFeeSchema>;
