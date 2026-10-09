import { z } from "zod";
import { ROLES } from "@/types/roles";
import { NOTIFICATION_CATEGORIES, PRIORITIES } from "./types";

const id = z.string().trim().min(1).max(128);
const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date and time");

/**
 * The composer. BOOKING is deliberately absent: booking notifications are
 * sent by the system from real booking changes, never hand-written.
 * Targeting is described by intent (`FOLLOWERS` of the chosen event/ghat);
 * the service turns that into a concrete stored audience.
 */
export const composeSchema = z
  .object({
    category: z.enum(["EMERGENCY", "CROWD", "EVENT_REMINDER", "MARKETING"]),
    priority: z.enum(PRIORITIES).default("NORMAL"),
    title: z.string().trim().min(3, "Add a title").max(80),
    message: z.string().trim().min(5, "Write a message").max(300),
    audience: z.discriminatedUnion("type", [
      z.object({ type: z.literal("ALL") }),
      z.object({ type: z.literal("ROLES"), roles: z.array(z.enum(ROLES)).min(1, "Pick at least one role").max(ROLES.length) }),
      z.object({ type: z.literal("FOLLOWERS") }),
      z.object({ type: z.literal("USER"), uid: id }),
    ]),
    /** Event and location (ghat) this is about. They also pick the followers when audience is FOLLOWERS. */
    eventId: id.optional(),
    ghatId: id.optional(),
    scheduleAt: isoDate.optional(),
    sendPush: z.boolean().default(true),
    /** Required for emergency alerts: an explicit "yes, alert these people". */
    confirmEmergency: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.ghatId && !v.eventId) ctx.addIssue({ code: "custom", path: ["eventId"], message: "Choose the event this location belongs to" });
    if (v.audience.type === "FOLLOWERS" && !v.eventId) ctx.addIssue({ code: "custom", path: ["eventId"], message: "Choose an event (and optionally a location) whose followers should receive this" });
    if (v.category === "EMERGENCY" && v.confirmEmergency !== true) ctx.addIssue({ code: "custom", path: ["confirmEmergency"], message: "Confirm that this is a genuine emergency alert" });
    if (v.category === "EMERGENCY" && (v.priority === "LOW" || v.priority === "NORMAL")) ctx.addIssue({ code: "custom", path: ["priority"], message: "Emergency alerts must be High or Urgent" });
    if (v.category === "MARKETING" && (v.priority === "HIGH" || v.priority === "URGENT")) ctx.addIssue({ code: "custom", path: ["priority"], message: "Promotions can't be High or Urgent" });
  });
export type ComposeInput = z.infer<typeof composeSchema>;

const categoryPref = z.object({ inApp: z.boolean().optional(), push: z.boolean().optional() }).strict();

export const updatePreferencesSchema = z
  .object({
    categories: z.object(Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, categoryPref.optional()])) as Record<(typeof NOTIFICATION_CATEGORIES)[number], z.ZodOptional<typeof categoryPref>>).strict(),
  })
  .strict();
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const followSchema = z.object({ kind: z.enum(["event", "ghat"]), id, value: z.boolean() }).strict();
export const deviceSchema = z.object({ token: z.string().trim().min(20).max(4096), platform: z.enum(["web", "android", "ios"]).default("web") }).strict();
export const unregisterDeviceSchema = z.object({ token: z.string().trim().min(20).max(4096) }).strict();
export const markReadSchema = z.union([z.object({ all: z.literal(true) }).strict(), z.object({ ids: z.array(id).min(1).max(100) }).strict()]);
