import { describe, it, expect } from "vitest";
import { bookingNotifications } from "./bookingMessages";

const b = { id: "b1", userId: "cust", providerOwnerId: "prov", serviceDate: "2026-10-12" };

describe("booking notifications", () => {
  it("creation notifies both sides, each with a stable unique key", () => {
    const n = bookingNotifications({ kind: "CREATED" }, b);
    expect(n.map((x) => x.uid).sort()).toEqual(["cust", "prov"]);
    expect(new Set(n.map((x) => x.key)).size).toBe(2);
    expect(n.every((x) => x.category === "BOOKING")).toBe(true);
  });
  it("nobody is notified about their own action", () => {
    expect(bookingNotifications({ kind: "STATUS", status: "CANCELLED", actor: "customer" }, b).map((x) => x.uid)).toEqual(["prov"]);
    expect(bookingNotifications({ kind: "STATUS", status: "CONFIRMED", actor: "provider" }, b).map((x) => x.uid)).toEqual(["cust"]);
    expect(bookingNotifications({ kind: "STATUS", status: "COMPLETED", actor: "customer" }, b)).toHaveLength(0);
  });
  it("status keys differ per status so a later change isn't swallowed by an earlier one", () => {
    const a = bookingNotifications({ kind: "STATUS", status: "CONFIRMED", actor: "system" }, b)[0].key;
    const c = bookingNotifications({ kind: "STATUS", status: "CANCELLED", actor: "admin" }, b)[0].key;
    expect(a).not.toBe(c);
  });
  it("payment and refund messages go to the customer; payment failure keys on the order", () => {
    expect(bookingNotifications({ kind: "PAYMENT_CAPTURED" }, b).map((x) => x.uid).sort()).toEqual(["cust", "prov"]);
    expect(bookingNotifications({ kind: "REFUND_PROCESSED" }, b).map((x) => x.uid)).toEqual(["cust"]);
    const f1 = bookingNotifications({ kind: "PAYMENT_FAILED", orderId: "o1" }, b)[0].key;
    const f2 = bookingNotifications({ kind: "PAYMENT_FAILED", orderId: "o2" }, b)[0].key;
    expect(f1).not.toBe(f2);
  });
  it("messages are factual and never claim to be live", () => {
    for (const ev of [{ kind: "CREATED" as const }, { kind: "PAYMENT_CAPTURED" as const }, { kind: "REFUND_PROCESSED" as const }]) {
      for (const n of bookingNotifications(ev, b)) expect(n.message.toLowerCase()).not.toContain("live");
    }
  });
});
