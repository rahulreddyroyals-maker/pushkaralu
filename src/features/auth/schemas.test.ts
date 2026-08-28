import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  phoneLoginSchema,
  assignRoleSchema,
} from "./schemas";

describe("registerSchema", () => {
  const base = {
    displayName: "Lakshmi Rao",
    email: "lakshmi@example.com",
    password: "Passw0rd",
    confirmPassword: "Passw0rd",
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: "Different1" });
    expect(result.success).toBe(false);
  });

  it("rejects a weak password (no digit)", () => {
    const result = registerSchema.safeParse({ ...base, password: "onlyletters", confirmPassword: "onlyletters" });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = registerSchema.safeParse({ ...base, password: "Ab1", confirmPassword: "Ab1" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty display name", () => {
    const result = registerSchema.safeParse({ ...base, displayName: "a" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials shape", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("rejects a malformed email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("phoneLoginSchema", () => {
  it("accepts E.164 format", () => {
    expect(phoneLoginSchema.safeParse({ phoneNumber: "+919876543210" }).success).toBe(true);
  });
  it("rejects a local-format number without country code", () => {
    expect(phoneLoginSchema.safeParse({ phoneNumber: "9876543210" }).success).toBe(false);
  });
});

describe("assignRoleSchema — server-side role assignment input", () => {
  it("accepts a known role with a reason", () => {
    const result = assignRoleSchema.safeParse({ role: "PUROHIT", reason: "Verified documents" });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown/malicious role string — cannot inject arbitrary roles", () => {
    const result = assignRoleSchema.safeParse({ role: "SUPER_ADMIN_HACKED", reason: "test" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing reason (audit trail requires justification)", () => {
    const result = assignRoleSchema.safeParse({ role: "PUROHIT", reason: "" });
    expect(result.success).toBe(false);
  });
});
