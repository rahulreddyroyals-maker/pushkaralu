import { z } from "zod";
import { ROLES } from "@/types/roles";

/**
 * Shared between client-side form validation (immediate feedback) and
 * server-side route handler validation (the actual trust boundary — see
 * spec §24 "server-side validation" and this sprint's "never trust
 * client-provided roles"). Using the same schema in both places means
 * they can't silently drift apart.
 */

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email: z.email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const phoneLoginSchema = z.object({
  // E.164 format, e.g. +919876543210 — required for Firebase phone auth.
  phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter phone number in +<country><number> format"),
});

export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;

export const phoneOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  locale: z.enum(["en", "te"]),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Server-side only: validates a role-assignment request body. `role` is
 * checked against the full ROLES enum here — the actual "is the CALLER
 * allowed to grant this role" check is authorization (see
 * src/lib/auth/guards.ts canAssignRole), not input validation, and happens
 * separately in the route handler.
 */
export const assignRoleSchema = z.object({
  role: z.enum(ROLES),
  reason: z.string().trim().min(3, "Provide a brief reason for the audit log").max(500),
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
