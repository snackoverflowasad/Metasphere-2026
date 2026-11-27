import { z } from "zod";
import { uuidSchema } from "@/lib/validation/common";

export const adminRoleEnum = z.enum(["super_admin", "content_admin", "editor"]);

export const inviteAdminUserSchema = z.object({
  email: z.string().trim().email("Valid email address is required"),
  displayName: z.string().trim().max(160).optional().default(""),
  role: adminRoleEnum,
  canApproveFinancial: z.boolean().default(false),
});

export type InviteAdminUserInput = z.input<typeof inviteAdminUserSchema>;

export const updateAdminRoleSchema = z.object({
  userId: uuidSchema("Valid user UUID is required"),
  displayName: z.string().trim().max(160).optional().default(""),
  role: adminRoleEnum,
  canApproveFinancial: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type UpdateAdminRoleInput = z.input<typeof updateAdminRoleSchema>;
