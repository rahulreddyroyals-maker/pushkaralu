import { z } from "zod";
import { LOST_FOUND_CATEGORIES, REPORT_TYPES } from "./types";
import { isPlausiblePhone } from "@/lib/safety/phone";
import { sensitiveTextError } from "@/lib/privacy/sensitive";

const phone = z
  .string()
  .trim()
  .refine((v) => isPlausiblePhone(v) && v.replace(/\D/g, "").length >= 6, "Enter a valid phone number");

export const createReportSchema = z.object({
  category: z.enum(LOST_FOUND_CATEGORIES),
  reportType: z.enum(REPORT_TYPES),
  title: z.string().trim().min(3, "Add a short title").max(120),
  description: z.string().trim().min(10, "Describe it in a little more detail").max(2000),
  lastSeenPlace: z.string().trim().min(2, "Where was it last seen?").max(120),
  lastSeenAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date and time"),
  contactPhone: phone,
  subjectName: z.string().trim().max(80).optional(),
  subjectAge: z.number().int().min(0).max(120).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

const publicText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} is too short`)
    .max(max)
    .superRefine((value, ctx) => {
      const problem = sensitiveTextError(label, value);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    });

export const moderateSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVE"),
    publicTitle: publicText("Public title", 3, 100),
    publicSummary: publicText("Public summary", 10, 500),
    publicArea: publicText("Public area", 2, 80),
  }),
  z.object({ decision: z.literal("REJECT"), reason: z.string().trim().min(3, "Give the reporter a reason").max(300) }),
  /** Take down something already public (abuse, mistaken publication). */
  z.object({ decision: z.literal("TAKEDOWN"), reason: z.string().trim().min(3, "Record why this was taken down").max(300) }),
]);
export type ModerateInput = z.infer<typeof moderateSchema>;

export const respondSchema = z.object({
  message: z.string().trim().min(5, "Say a little more").max(500),
  contactPhone: phone,
});
export type RespondInput = z.infer<typeof respondSchema>;
