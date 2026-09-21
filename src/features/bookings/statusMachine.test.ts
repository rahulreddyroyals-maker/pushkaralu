import { describe, it, expect } from "vitest";
import { canTransitionBookingStatus, allowedNextStatuses } from "./statusMachine";

describe("canTransitionBookingStatus", () => {
  it("allows a provider to confirm a pending booking", () => {
    expect(canTransitionBookingStatus("PENDING", "CONFIRMED", "provider")).toBe(true);
  });

  it("denies a customer confirming their own booking", () => {
    expect(canTransitionBookingStatus("PENDING", "CONFIRMED", "customer")).toBe(false);
  });

  it("allows any party to cancel a pending booking", () => {
    expect(canTransitionBookingStatus("PENDING", "CANCELLED", "customer")).toBe(true);
    expect(canTransitionBookingStatus("PENDING", "CANCELLED", "provider")).toBe(true);
    expect(canTransitionBookingStatus("PENDING", "CANCELLED", "admin")).toBe(true);
  });

  it("denies a provider issuing a refund — admin-only, since it moves money", () => {
    expect(canTransitionBookingStatus("CONFIRMED", "REFUNDED", "provider")).toBe(false);
    expect(canTransitionBookingStatus("CONFIRMED", "REFUNDED", "admin")).toBe(true);
  });

  it("denies a customer marking their own booking completed", () => {
    expect(canTransitionBookingStatus("CONFIRMED", "COMPLETED", "customer")).toBe(false);
    expect(canTransitionBookingStatus("CONFIRMED", "COMPLETED", "provider")).toBe(true);
  });

  it("denies any transition out of a terminal CANCELLED state", () => {
    expect(canTransitionBookingStatus("CANCELLED", "CONFIRMED", "admin")).toBe(false);
    expect(canTransitionBookingStatus("CANCELLED", "PENDING", "admin")).toBe(false);
  });

  it("denies any transition out of a terminal REFUNDED state", () => {
    expect(canTransitionBookingStatus("REFUNDED", "CONFIRMED", "admin")).toBe(false);
  });

  it("allows admin to refund even a COMPLETED booking (post-completion dispute)", () => {
    expect(canTransitionBookingStatus("COMPLETED", "REFUNDED", "admin")).toBe(true);
  });

  it("denies an invalid/unmodeled transition", () => {
    expect(canTransitionBookingStatus("PENDING", "COMPLETED", "admin")).toBe(false);
  });
});

describe("allowedNextStatuses", () => {
  it("lists exactly what a provider can do from PENDING", () => {
    expect(allowedNextStatuses("PENDING", "provider").sort()).toEqual(["CANCELLED", "CONFIRMED"]);
  });

  it("lists exactly what a customer can do from PENDING", () => {
    expect(allowedNextStatuses("PENDING", "customer")).toEqual(["CANCELLED"]);
  });

  it("returns an empty list for a terminal state", () => {
    expect(allowedNextStatuses("CANCELLED", "admin")).toEqual([]);
  });

  it("lists all three admin options from CONFIRMED", () => {
    expect(allowedNextStatuses("CONFIRMED", "admin").sort()).toEqual(["CANCELLED", "COMPLETED", "REFUNDED"]);
  });
});
