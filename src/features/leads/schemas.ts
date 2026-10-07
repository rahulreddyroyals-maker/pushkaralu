import { z } from "zod";
import { ALL_LEAD_TYPES, LEAD_STATUSES } from "./types";

export const leadInputSchema = z.object({
  providerId: z.string().min(1),
  providerType: z.enum(ALL_LEAD_TYPES),
  userContactPhone: z.string().trim().min(6, "Enter a valid phone number"),
  message: z.string().trim().min(5, "Say a little about what you need").max(1000),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export const leadStatusUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES),
});
