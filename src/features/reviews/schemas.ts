import { z } from "zod";
import { LEAD_PROVIDER_TYPES } from "@/features/leads/types";

export const reviewInputSchema = z.object({
  providerId: z.string().min(1),
  providerType: z.enum(LEAD_PROVIDER_TYPES),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(3, "Say a little more").max(1000),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
