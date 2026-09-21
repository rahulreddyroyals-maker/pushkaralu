import { z } from "zod";

export const monetizationSettingsInputSchema = z.object({
  bookingCommissionPercent: z.coerce.number().min(0).max(100),
  leadFee: z.coerce.number().min(0),
  featuredListingPrice: z.coerce.number().min(0),
  sponsoredListingPrice: z.coerce.number().min(0),
});

export type MonetizationSettingsInput = z.infer<typeof monetizationSettingsInputSchema>;
