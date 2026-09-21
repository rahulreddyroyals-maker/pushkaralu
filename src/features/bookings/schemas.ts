import { z } from "zod";
import { LEAD_PROVIDER_TYPES } from "@/features/leads/types";
import { BOOKING_STATUSES } from "./types";

export const createBookingInputSchema = z.object({
  providerId: z.string().min(1),
  providerType: z.enum(LEAD_PROVIDER_TYPES),
  userContactPhone: z.string().trim().min(6, "Enter a valid phone number"),
  serviceDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  serviceTime: z.string().trim().max(50).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(100),
  amount: z.coerce.number().min(0),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;

export const bookingStatusUpdateSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
});

export type BookingStatusUpdateInput = z.infer<typeof bookingStatusUpdateSchema>;
