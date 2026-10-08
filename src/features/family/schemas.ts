import { z } from "zod";
import { isPlausiblePhone } from "@/lib/safety/phone";
import { SAFETY_LIMITS } from "@/config/app";

const phone = z.string().trim().refine((v) => isPlausiblePhone(v) && v.replace(/\D/g, "").length >= 6, "Enter a valid phone number");

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(60),
  phone,
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, "Give the group a name").max(60),
  emergencyContact: emergencyContactSchema.optional(),
});

export const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
export const joinSchema = z.object({
  code: z.string().trim().toUpperCase().regex(INVITE_CODE_PATTERN, "That doesn't look like an invite code"),
  emergencyContact: emergencyContactSchema.optional(),
});

export const profileSchema = z.object({ emergencyContact: emergencyContactSchema.nullable() });

/**
 * Turning sharing ON requires an explicit `consent: true` AND a bounded
 * duration. There is no "until I turn it off": every share ends on its own.
 */
export const sharingSchema = z.discriminatedUnion("enabled", [
  z.object({
    enabled: z.literal(true),
    consent: z.literal(true, { message: "Location sharing needs your explicit consent" }),
    durationHours: z.number().min(0.25).max(SAFETY_LIMITS.familyMaxShareHours),
  }),
  z.object({ enabled: z.literal(false) }),
]);

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(100_000).optional(),
});

export const meetingPointSchema = z.object({
  name: z.string().trim().min(2, "Name the meeting point").max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  note: z.string().trim().max(200).optional(),
  meetAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid time").optional(),
});

export const alertSchema = z
  .object({
    message: z.string().trim().max(280).default(""),
    /** Per-alert, explicit. Independent of continuous location sharing. */
    includeLocation: z.boolean().default(false),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    /** Also notify platform staff — off unless the sender turns it on. */
    escalate: z.boolean().default(false),
    callbackPhone: phone.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.includeLocation && (v.latitude === undefined || v.longitude === undefined)) {
      ctx.addIssue({ code: "custom", path: ["latitude"], message: "Location was requested but not provided" });
    }
    if (v.escalate && !v.callbackPhone) {
      ctx.addIssue({ code: "custom", path: ["callbackPhone"], message: "Give a phone number so staff can reach you" });
    }
  });

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type JoinInput = z.infer<typeof joinSchema>;
export type SharingInput = z.infer<typeof sharingSchema>;
export type AlertInput = z.infer<typeof alertSchema>;
