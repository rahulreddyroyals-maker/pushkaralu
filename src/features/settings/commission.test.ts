import { describe, it, expect } from "vitest";
import { calculateCommission, calculateProviderPayout } from "./commission";

describe("calculateCommission", () => {
  it("computes a standard percentage correctly", () => {
    expect(calculateCommission(1000, 10)).toBe(100);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateCommission(999, 10)).toBe(99.9);
    expect(calculateCommission(333, 7.5)).toBe(24.98); // 24.975 rounds to 24.98
  });

  it("returns 0 for a 0% commission rate", () => {
    expect(calculateCommission(5000, 0)).toBe(0);
  });

  it("handles a 100% commission rate", () => {
    expect(calculateCommission(500, 100)).toBe(500);
  });

  it("throws on a negative amount", () => {
    expect(() => calculateCommission(-100, 10)).toThrow();
  });

  it("throws on a negative commission percent", () => {
    expect(() => calculateCommission(100, -5)).toThrow();
  });
});

describe("calculateProviderPayout", () => {
  it("subtracts commission from the total amount", () => {
    expect(calculateProviderPayout(1000, 100)).toBe(900);
  });

  it("returns the full amount when commission is 0", () => {
    expect(calculateProviderPayout(500, 0)).toBe(500);
  });
});
